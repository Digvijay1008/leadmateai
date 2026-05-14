import React, { useState, useEffect } from 'react';
import { Property, PropertyCreateInput, PropertyType } from '../types';
import { useCreateProperty, useUpdateProperty } from '../hooks';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyToEdit?: Property;
}

export function PropertyFormModal({ isOpen, onClose, propertyToEdit }: PropertyFormModalProps) {
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();

  const isEditing = !!propertyToEdit;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [formData, setFormData] = useState<Partial<PropertyCreateInput>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && propertyToEdit) {
      setFormData({
        title: propertyToEdit.title,
        property_type: propertyToEdit.property_type,
        price: propertyToEdit.price,
        price_unit: propertyToEdit.price_unit as any,
        area: propertyToEdit.area,
        area_unit: propertyToEdit.area_unit as any,
        bedrooms: propertyToEdit.bedrooms || 0,
        bathrooms: propertyToEdit.bathrooms || 0,
        location: propertyToEdit.location || {},
        features: propertyToEdit.features || [],
        images: propertyToEdit.images || [],
      });
      setErrors({});
    } else if (isOpen) {
      setFormData({
        title: '',
        property_type: 'apartment',
        price: 0,
        price_unit: 'Lakh',
        area: 0,
        area_unit: 'sqft',
        bedrooms: 0,
        bathrooms: 0,
        location: { city: '', address: '' },
        features: [],
        images: [],
      });
      setErrors({});
    }
  }, [isOpen, propertyToEdit]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = 'Title is required';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.area || formData.area <= 0) newErrors.area = 'Area must be greater than 0';
    if (!formData.location?.city?.trim()) newErrors.city = 'City is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    if (isEditing && propertyToEdit) {
      updateMutation.mutate(
        { id: propertyToEdit.id, data: formData as Partial<PropertyCreateInput> },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(formData as PropertyCreateInput, { onSuccess: onClose });
    }
  };

  const handleLocationChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Property' : 'Add New Property'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Basic Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title/Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border ${errors.title ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2 text-slate-900 dark:text-white`}
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={formData.property_type || 'apartment'}
                    onChange={(e) => handleFieldChange('property_type', e.target.value as PropertyType)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="house">House</option>
                    <option value="plot">Plot</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Price <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => handleFieldChange('price', Number(e.target.value))}
                      className={`w-full bg-slate-50 dark:bg-slate-800 border ${errors.price ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2 text-slate-900 dark:text-white`}
                    />
                    <select
                      value={formData.price_unit || 'Lakh'}
                      onChange={(e) => handleFieldChange('price_unit', e.target.value as any)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="Lakh">Lakh</option>
                      <option value="Crore">Crore</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                  {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Location & Specs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">City <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.location?.city || ''}
                    onChange={(e) => handleLocationChange('city', e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border ${errors.city ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2 text-slate-900 dark:text-white`}
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Address / Locality</label>
                  <input
                    type="text"
                    value={formData.location?.address || ''}
                    onChange={(e) => handleLocationChange('address', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Area (sqft) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={formData.area || ''}
                    onChange={(e) => handleFieldChange('area', Number(e.target.value))}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border ${errors.area ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2 text-slate-900 dark:text-white`}
                  />
                  {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
                </div>
                <div className="flex gap-4">
                   <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Beds</label>
                      <input
                        type="number"
                        value={formData.bedrooms || ''}
                        onChange={(e) => handleFieldChange('bedrooms', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white"
                      />
                   </div>
                   <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Baths</label>
                      <input
                        type="number"
                        value={formData.bathrooms || ''}
                        onChange={(e) => handleFieldChange('bathrooms', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white"
                      />
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Media & Attachments</h3>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-800/50">
                 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Drag & drop images and brochures here</p>
                 <p className="text-xs text-slate-500 mt-1">Images will be parsed by AI to enrich property details</p>
              </div>
            </div>

            {(createMutation.error || updateMutation.error) && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium flex gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {(createMutation.error as any)?.message || (updateMutation.error as any)?.message || 'An error occurred'}
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            form="property-form"
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Property' : 'Create Property'}
          </button>
        </div>
      </div>
    </div>
  );
}
