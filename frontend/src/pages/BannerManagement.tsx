import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import { useAdminSearchQuery, matchesQuery } from '../hooks/useAdminSearch';
import {
  BANNER_PLACEMENTS,
  BannerPlacement,
  SponsorBanner,
  createBanner,
  deleteBanner,
  listBannersAdmin,
  updateBanner,
  uploadBannerImage,
} from '../services/bannersService';
import './BannerManagement.css';

interface Fair { id: string; name: string; }

const EMPTY_FORM = {
  imageUrl: '',
  linkUrl: '',
  altText: '',
  placement: 'home_bottom' as BannerPlacement,
  fairId: '' as string,
  startsAt: '',
  endsAt: '',
  priority: 0,
  isActive: true,
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusOf(b: SponsorBanner): 'active' | 'inactive' | 'scheduled' | 'expired' {
  if (!b.isActive) return 'inactive';
  const now = Date.now();
  const start = new Date(b.startsAt).getTime();
  const end = new Date(b.endsAt).getTime();
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
}

const BannerManagement: React.FC = () => {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<SponsorBanner[]>([]);
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    adminApi.getFairs().then((d: { fairs: Fair[] }) => setFairs(d.fairs || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBanners(await listBannersAdmin());
    } catch {
      setMessage({ type: 'error', text: t('bannerAdmin.loadFailed', 'Could not load banners') });
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const searchQuery = useAdminSearchQuery();
  const visibleBanners = useMemo(() => {
    if (!searchQuery) return banners;
    const fairNameById = new Map(fairs.map(f => [f.id, f.name]));
    return banners.filter(b =>
      matchesQuery(b.altText, searchQuery) ||
      matchesQuery(b.placement, searchQuery) ||
      matchesQuery(b.linkUrl, searchQuery) ||
      matchesQuery(b.fairId ? fairNameById.get(b.fairId) ?? null : null, searchQuery)
    );
  }, [banners, fairs, searchQuery]);

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); };

  const beginEdit = (b: SponsorBanner) => {
    setEditingId(b.id);
    setForm({
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? '',
      altText: b.altText ?? '',
      placement: b.placement,
      fairId: b.fairId ?? '',
      startsAt: toLocalInput(b.startsAt),
      endsAt: toLocalInput(b.endsAt),
      priority: b.priority,
      isActive: b.isActive,
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setForm(f => ({ ...f, imageUrl: url }));
    } catch {
      setMessage({ type: 'error', text: t('bannerAdmin.uploadFailed', 'Upload failed') });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) {
      setMessage({ type: 'error', text: t('bannerAdmin.imageRequired', 'Upload an image first') }); return;
    }
    if (!form.startsAt || !form.endsAt) {
      setMessage({ type: 'error', text: t('bannerAdmin.datesRequired') }); return;
    }
    const payload = {
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl.trim() || null,
      altText: form.altText.trim() || null,
      placement: form.placement,
      fairId: form.fairId || null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      priority: form.priority,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await updateBanner(editingId, payload);
        setMessage({ type: 'success', text: t('bannerAdmin.updated', 'Banner updated') });
      } else {
        await createBanner(payload);
        setMessage({ type: 'success', text: t('bannerAdmin.created', 'Banner created') });
      }
      resetForm();
      await load();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessage({ type: 'error', text: (err as any)?.response?.data?.error ?? t('bannerAdmin.saveFailed') });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('bannerAdmin.confirmDelete', 'Delete this banner?'))) return;
    try {
      await deleteBanner(id);
      if (editingId === id) resetForm();
      await load();
    } catch {
      setMessage({ type: 'error', text: t('bannerAdmin.deleteFailed') });
    }
  };

  return (
    <div className="banner-mgmt">
      <div>
        <h2>{t('bannerAdmin.title', 'Sponsor banners')}</h2>
        <p className="lede">{t('bannerAdmin.lede', 'Upload sponsor creatives, assign them to placements, and schedule a run window. Impressions and clicks are logged automatically.')}</p>
      </div>

      {message && <div className={`banner-msg ${message.type}`}>{message.text}</div>}

      <div className="banner-grid">
        <div>
          {loading ? (
            <div className="banner-msg">{t('common.loading', 'Loading...')}</div>
          ) : banners.length === 0 ? (
            <div className="banner-msg">{t('bannerAdmin.empty', 'No banners yet.')}</div>
          ) : visibleBanners.length === 0 ? (
            <div className="banner-msg">{t('common.noResults', { defaultValue: 'No results found.' })}</div>
          ) : (
            <table className="banner-table">
              <thead>
                <tr>
                  <th></th>
                  <th>{t('bannerAdmin.placement', 'Placement')}</th>
                  <th>{t('bannerAdmin.fair', 'Fair')}</th>
                  <th>{t('bannerAdmin.window', 'Window')}</th>
                  <th>{t('bannerAdmin.status', 'Status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleBanners.map(b => {
                  const s = statusOf(b);
                  return (
                    <tr key={b.id}>
                      <td><img src={b.imageUrl} alt="" className="thumb" /></td>
                      <td>{b.placement}</td>
                      <td>{b.fairId ? (fairs.find(f => f.id === b.fairId)?.name ?? '—') : t('bannerAdmin.global')}</td>
                      <td style={{ fontSize: 11, color: '#6b7280' }}>
                        {new Date(b.startsAt).toLocaleDateString()}<br />
                        → {new Date(b.endsAt).toLocaleDateString()}
                      </td>
                      <td><span className={`banner-status ${s}`}>{t(`bannerAdmin.statuses.${s}`)}</span></td>
                      <td>
                        <button className="banner-btn ghost" onClick={() => beginEdit(b)}>{t('common.edit')}</button>
                        <button className="banner-btn danger" style={{ marginLeft: 6 }} onClick={() => handleDelete(b.id)}>{t('common.delete')}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <form className="banner-form" onSubmit={submit}>
          <h3>{editingId ? t('bannerAdmin.edit', 'Edit banner') : t('bannerAdmin.new', 'New banner')}</h3>

          <label>
            {t('bannerAdmin.image', 'Image')}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              disabled={uploading}
            />
            {form.imageUrl && (
              <div className="banner-preview"><img src={form.imageUrl} alt="" /></div>
            )}
          </label>

          <div className="banner-form-row">
            <label>
              {t('bannerAdmin.placement', 'Placement')}
              <select value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value as BannerPlacement })}>
                {BANNER_PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label>
              {t('bannerAdmin.fair', 'Fair')}
              <select value={form.fairId} onChange={e => setForm({ ...form, fairId: e.target.value })}>
                <option value="">{t('bannerAdmin.globalAllFairs')}</option>
                {fairs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          </div>

          <label>
            {t('bannerAdmin.linkUrl', 'Click-through URL (optional)')}
            <input value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://" />
          </label>

          <label>
            {t('bannerAdmin.altText', 'Alt text (for screen readers)')}
            <input value={form.altText} onChange={e => setForm({ ...form, altText: e.target.value })} />
          </label>

          <div className="banner-form-row">
            <label>
              {t('bannerAdmin.startsAt', 'Starts')}
              <input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} required />
            </label>
            <label>
              {t('bannerAdmin.endsAt', 'Ends')}
              <input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} required />
            </label>
          </div>

          <div className="banner-form-row">
            <label>
              {t('bannerAdmin.priority', 'Priority (higher wins)')}
              <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) || 0 })} />
            </label>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              <span>{t('bannerAdmin.active', 'Active')}</span>
            </label>
          </div>

          <div className="banner-form-actions">
            {editingId && <button type="button" className="banner-btn ghost" onClick={resetForm}>{t('common.cancel')}</button>}
            <button type="submit" className="banner-btn primary" disabled={uploading}>
              {editingId ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerManagement;
