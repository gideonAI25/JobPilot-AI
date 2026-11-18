import React, { useState } from 'react';
import { CertificationEntry, SectionStatus } from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, Button } from '../common/FormControls';
import { AwardIcon, PlusIcon, EditIcon, TrashIcon, XIcon, SaveIcon, ExternalLinkIcon } from '@/components/icons/Icons';
import { generateId } from '@/services/profileService';

interface CertificationsSectionProps {
  certifications: CertificationEntry[];
  status: SectionStatus;
  onAdd: (cert: CertificationEntry) => void;
  onUpdate: (id: string, updated: Partial<CertificationEntry>) => void;
  onRemove: (id: string) => void;
}

export function CertificationsSection({
  certifications,
  status,
  onAdd,
  onUpdate,
  onRemove,
}: CertificationsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<CertificationEntry, 'id'>>({
    name: '',
    issuingOrganization: '',
    dateObtained: '',
    credentialUrl: '',
  });

  const openNewForm = () => {
    setFormData({
      name: '',
      issuingOrganization: '',
      dateObtained: '',
      credentialUrl: '',
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditForm = (cert: CertificationEntry) => {
    setFormData({
      name: cert.name,
      issuingOrganization: cert.issuingOrganization,
      dateObtained: cert.dateObtained,
      credentialUrl: cert.credentialUrl,
    });
    setEditingId(cert.id);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.issuingOrganization.trim()) return;

    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      onAdd({
        id: generateId(),
        ...formData,
      });
    }

    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <SectionCard
      title="Certifications"
      description="Professional certifications, credentials, cloud accreditations, and verified licenses"
      icon={<AwardIcon className="w-5 h-5" />}
      status={status}
      headerAction={
        !isEditing && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<PlusIcon className="w-3.5 h-3.5" />}
            onClick={openNewForm}
          >
            Add Certification
          </Button>
        )
      }
    >
      {/* Inline Form */}
      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId ? 'Edit Certification' : 'Add New Certification'}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Certification Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. AWS Certified Solutions Architect - Associate"
              required
            />

            <InputField
              label="Issuing Organization"
              name="issuingOrganization"
              value={formData.issuingOrganization}
              onChange={(e) =>
                setFormData({ ...formData, issuingOrganization: e.target.value })
              }
              placeholder="e.g. Amazon Web Services (AWS)"
              required
            />

            <InputField
              label="Date Obtained / Issued"
              name="dateObtained"
              value={formData.dateObtained}
              onChange={(e) => setFormData({ ...formData, dateObtained: e.target.value })}
              placeholder="e.g. Mar 2023"
            />

            <InputField
              label="Credential URL / Verification Link"
              name="credentialUrl"
              type="url"
              value={formData.credentialUrl}
              onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value })}
              placeholder="e.g. https://cp.certmetrics.com/..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<SaveIcon className="w-3.5 h-3.5" />}
              disabled={!formData.name.trim() || !formData.issuingOrganization.trim()}
            >
              {editingId ? 'Update Certification' : 'Save Certification'}
            </Button>
          </div>
        </form>
      )}

      {/* Certifications List */}
      {certifications.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <AwardIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No Certifications Recorded</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
            Include technical certifications (AWS, GCP, CKA, CISSP, etc.) to validate domain capabilities.
          </p>
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={openNewForm}
              className="mt-4"
            >
              Add Certification
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {cert.name}
                  </h4>
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 text-xs font-medium"
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </a>
                  )}
                </div>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {cert.issuingOrganization}
                  {cert.dateObtained && (
                    <span className="text-zinc-400 ml-2 font-normal">• Issued {cert.dateObtained}</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditForm(cert)}
                  title="Edit certification"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(cert.id)}
                  title="Delete certification"
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
