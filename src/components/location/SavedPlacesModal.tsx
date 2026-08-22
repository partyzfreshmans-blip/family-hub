'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FamilySavedPlace } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { MapPin, Plus, Trash2, Crosshair, Home, GraduationCap, Briefcase, HeartHandshake, Building2 } from 'lucide-react';

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: FamilySavedPlace[];
  onPlacesUpdated: () => void;
  myCoordinates?: { latitude: number; longitude: number } | null;
}

export default function SavedPlacesModal({
  isOpen,
  onClose,
  places,
  onPlacesUpdated,
  myCoordinates,
}: SavedPlacesModalProps) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState<number | ''>(myCoordinates ? myCoordinates.latitude : '');
  const [longitude, setLongitude] = useState<number | ''>(myCoordinates ? myCoordinates.longitude : '');
  const [radiusMeters, setRadiusMeters] = useState<number>(150);
  const [category, setCategory] = useState<FamilySavedPlace['category']>('HOME');
  const [saving, setSaving] = useState(false);

  const handleUseCurrentCoords = () => {
    if (myCoordinates) {
      setLatitude(myCoordinates.latitude);
      setLongitude(myCoordinates.longitude);
    }
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || typeof latitude !== 'number' || typeof longitude !== 'number') return;

    setSaving(true);
    try {
      const res = await fetch('/api/location/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          latitude,
          longitude,
          radius_meters: radiusMeters,
          category,
          icon: category === 'HOME' ? 'Home' : category === 'SCHOOL' ? 'GraduationCap' : 'MapPin',
        }),
      });
      if (res.ok) {
        setName('');
        setIsAdding(false);
        onPlacesUpdated();
      }
    } catch (err) {
      console.error('Error saving place:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlace = async (id: string) => {
    if (!confirm('คุณต้องการลบสถานที่นี้ใช่หรือไม่?')) return;
    try {
      await fetch(`/api/location/places?id=${id}`, { method: 'DELETE' });
      onPlacesUpdated();
    } catch (err) {
      console.error('Error deleting place:', err);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'HOME':
        return <Home className="w-4 h-4 text-emerald-500" />;
      case 'SCHOOL':
        return <GraduationCap className="w-4 h-4 text-amber-500" />;
      case 'WORK':
        return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'HOSPITAL':
        return <HeartHandshake className="w-4 h-4 text-rose-500" />;
      default:
        return <Building2 className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.location.savedPlaces} maxWidth="md">
      <div className="space-y-5">
        {/* Place List */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {places.length > 0 ? (
            places.map((place) => (
              <div
                key={place.id}
                className="p-3.5 rounded-2xl bg-card border border-border/80 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center">
                    {getCategoryIcon(place.category)}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{place.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      รัศมี {place.radius_meters} เมตร • {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeletePlace(place.id)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="ลบสถานที่"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">ยังไม่มีสถานที่สำคัญที่บันทึกไว้</div>
          )}
        </div>

        {/* Add Place Section */}
        {isAdding ? (
          <form onSubmit={handleSavePlace} className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary" /> {t.location.addPlace}
            </h4>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                {t.location.placeName} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น บ้านสุขใจ, โรงเรียน, ที่ทำงาน"
                className="w-full px-3 py-2 rounded-xl bg-card border border-input text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  {t.location.category}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-input text-foreground text-sm outline-none"
                >
                  <option value="HOME">บ้าน</option>
                  <option value="SCHOOL">โรงเรียน</option>
                  <option value="WORK">ที่ทำงาน</option>
                  <option value="GRANDPARENTS">บ้านญาติ</option>
                  <option value="HOSPITAL">โรงพยาบาล</option>
                  <option value="OTHER">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">
                  {t.location.radiusMeters}
                </label>
                <select
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-input text-foreground text-sm outline-none"
                >
                  <option value={100}>100 เมตร (บ้าน)</option>
                  <option value={150}>150 เมตร (โรงเรียน/ที่ทำงาน)</option>
                  <option value={200}>200 เมตร (ห้างสรรพสินค้า)</option>
                  <option value={300}>300 เมตร (บริเวณกว้าง)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  placeholder="19.9072"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-input text-foreground text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  placeholder="99.8325"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-input text-foreground text-sm outline-none"
                />
              </div>
            </div>

            {myCoordinates && (
              <button
                type="button"
                onClick={handleUseCurrentCoords}
                className="w-full py-2 rounded-xl bg-secondary/80 hover:bg-secondary text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Crosshair className="w-3.5 h-3.5" />
                ใช้พิกัดตำแหน่งปัจจุบันของคุณ
              </button>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm"
              >
                {saving ? t.common.saving : t.common.save}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              if (myCoordinates) {
                setLatitude(myCoordinates.latitude);
                setLongitude(myCoordinates.longitude);
              }
              setIsAdding(true);
            }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t.location.addPlace}
          </button>
        )}
      </div>
    </Modal>
  );
}
