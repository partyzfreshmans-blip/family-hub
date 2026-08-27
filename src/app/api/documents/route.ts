import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { FamilyDocument } from '@/types';

// Helper to compute expiry status
function computeExpiry(expiryDateStr?: string | null): { status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY'; days: number | null } {
  if (!expiryDateStr) {
    return { status: 'NO_EXPIRY', days: null };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);

  if (isNaN(exp.getTime())) {
    return { status: 'NO_EXPIRY', days: null };
  }

  const diffTime = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'EXPIRED', days: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'EXPIRING_SOON', days: diffDays };
  } else {
    return { status: 'VALID', days: diffDays };
  }
}

// GET: Fetch all accessible documents for the family
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const role = ctx.member.role;

    const url = new URL(request.url);
    const categoryFilter = url.searchParams.get('category');
    const ownerFilter = url.searchParams.get('owner');

    const sql = `
      SELECT 
        d.*,
        om.nickname as owner_nick,
        om.member_color as owner_color,
        ou.avatar_url as owner_avatar,
        cm.nickname as creator_nick
      FROM documents d
      LEFT JOIN family_members om ON d.owner_member_id = om.id
      LEFT JOIN users ou ON om.user_id = ou.id
      LEFT JOIN family_members cm ON d.created_by = cm.id
      WHERE d.family_id = ?
      ORDER BY 
        CASE 
          WHEN d.expiry_date IS NOT NULL AND d.expiry_date != '' THEN 0 
          ELSE 1 
        END,
        d.expiry_date ASC,
        d.created_at DESC
    `;

    const allDocs = (await query<any>(sql, [familyId])) || [];

    // Filter by privacy level based on caller role and membership
    const accessibleDocs: FamilyDocument[] = allDocs.filter((doc) => {
      // 1. Private to specific member or creator
      if (doc.privacy_level === 'PRIVATE') {
        return (
          doc.owner_member_id === memberId ||
          doc.created_by === memberId ||
          role === 'ADMIN' ||
          ctx.family.owner_id === ctx.user.id
        );
      }

      // 2. Adults & Admins Only
      if (doc.privacy_level === 'ADULTS') {
        return role !== 'CHILD';
      }

      // 3. Family shared
      return true;
    });

    // Compute expiry and apply query params
    const processedDocs = accessibleDocs.map((doc) => {
      const exp = computeExpiry(doc.expiry_date);
      return {
        ...doc,
        expiry_status: exp.status,
        days_until_expiry: exp.days,
      };
    });

    let filteredDocs = processedDocs;
    if (categoryFilter && categoryFilter !== 'ALL') {
      filteredDocs = filteredDocs.filter((d) => d.category === categoryFilter);
    }
    if (ownerFilter && ownerFilter !== 'ALL') {
      if (ownerFilter === 'SHARED') {
        filteredDocs = filteredDocs.filter((d) => !d.owner_member_id);
      } else {
        filteredDocs = filteredDocs.filter((d) => d.owner_member_id === ownerFilter);
      }
    }

    // Counts by category
    const categoryCounts: Record<string, number> = {
      ALL: accessibleDocs.length,
      HOUSE: 0,
      VEHICLE: 0,
      PERSONAL: 0,
      FINANCE: 0,
      OTHER: 0,
    };
    accessibleDocs.forEach((d) => {
      if (categoryCounts[d.category] !== undefined) {
        categoryCounts[d.category]++;
      }
    });

    // Expiring soon or expired items for high-priority banner
    const alertDocs = processedDocs.filter(
      (d) => d.expiry_status === 'EXPIRING_SOON' || d.expiry_status === 'EXPIRED'
    );

    return NextResponse.json({
      documents: filteredDocs,
      categoryCounts,
      alertDocs,
      totalCount: accessibleDocs.length,
    });
  } catch (err: any) {
    console.error('Error fetching documents:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST: Create a new document
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const body = await request.json();

    const {
      title,
      category,
      sub_category,
      document_number,
      issuer,
      owner_member_id,
      privacy_level = 'FAMILY',
      issue_date,
      expiry_date,
      file_url,
      file_name,
      file_type,
      notes,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const validCategories = ['HOUSE', 'VEHICLE', 'PERSONAL', 'FINANCE', 'OTHER'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const docId = generateId('doc_');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO documents (
        id, family_id, title, category, sub_category, document_number, issuer,
        owner_member_id, privacy_level, issue_date, expiry_date,
        file_url, file_name, file_type, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        familyId,
        title.trim(),
        category,
        sub_category?.trim() || null,
        document_number?.trim() || null,
        issuer?.trim() || null,
        owner_member_id || null,
        privacy_level,
        issue_date || null,
        expiry_date || null,
        file_url || null,
        file_name || null,
        file_type || null,
        notes?.trim() || null,
        memberId,
        now,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      documentId: docId,
      message: 'Document saved successfully',
    });
  } catch (err: any) {
    console.error('Error creating document:', err);
    return NextResponse.json({ error: err.message || 'Failed to create document' }, { status: 500 });
  }
}

// PATCH: Update an existing document
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const role = ctx.member.role;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Check document existence & permissions
    const existing = await queryOne<any>(
      'SELECT * FROM documents WHERE id = ? AND family_id = ?',
      [id, familyId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Permission check: Creator, Admin/Owner, or Owner Member can edit
    const canEdit =
      role === 'ADMIN' ||
      ctx.family.owner_id === ctx.user.id ||
      existing.created_by === memberId ||
      existing.owner_member_id === memberId;

    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied to edit this document' }, { status: 403 });
    }

    const now = new Date().toISOString();
    await execute(
      `UPDATE documents SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        sub_category = ?,
        document_number = ?,
        issuer = ?,
        owner_member_id = ?,
        privacy_level = COALESCE(?, privacy_level),
        issue_date = ?,
        expiry_date = ?,
        file_url = ?,
        file_name = ?,
        file_type = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND family_id = ?`,
      [
        updates.title?.trim() ?? existing.title,
        updates.category ?? existing.category,
        updates.sub_category !== undefined ? (updates.sub_category?.trim() || null) : existing.sub_category,
        updates.document_number !== undefined ? (updates.document_number?.trim() || null) : existing.document_number,
        updates.issuer !== undefined ? (updates.issuer?.trim() || null) : existing.issuer,
        updates.owner_member_id !== undefined ? (updates.owner_member_id || null) : existing.owner_member_id,
        updates.privacy_level ?? existing.privacy_level,
        updates.issue_date !== undefined ? (updates.issue_date || null) : existing.issue_date,
        updates.expiry_date !== undefined ? (updates.expiry_date || null) : existing.expiry_date,
        updates.file_url !== undefined ? (updates.file_url || null) : existing.file_url,
        updates.file_name !== undefined ? (updates.file_name || null) : existing.file_name,
        updates.file_type !== undefined ? (updates.file_type || null) : existing.file_type,
        updates.notes !== undefined ? (updates.notes?.trim() || null) : existing.notes,
        now,
        id,
        familyId,
      ]
    );

    return NextResponse.json({ success: true, message: 'Document updated successfully' });
  } catch (err: any) {
    console.error('Error updating document:', err);
    return NextResponse.json({ error: err.message || 'Failed to update document' }, { status: 500 });
  }
}

// DELETE: Remove a document
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const role = ctx.member.role;

    const url = new URL(request.url);
    const docId = url.searchParams.get('id');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const existing = await queryOne<any>(
      'SELECT * FROM documents WHERE id = ? AND family_id = ?',
      [docId, familyId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Permission check
    const canDelete =
      role === 'ADMIN' ||
      ctx.family.owner_id === ctx.user.id ||
      existing.created_by === memberId ||
      existing.owner_member_id === memberId;

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied to delete this document' }, { status: 403 });
    }

    await execute('DELETE FROM documents WHERE id = ? AND family_id = ?', [docId, familyId]);

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting document:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete document' }, { status: 500 });
  }
}
