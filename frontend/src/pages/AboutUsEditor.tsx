import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAboutUsApi } from '../services/api';
import './AboutUsEditor.css';

interface AboutContent {
  id: string;
  sectionKey: string;
  contentAz: string | null;
  contentEn: string | null;
  updatedAt: string;
  updatedBy?: {
    firstName: string;
    lastName: string;
  };
}

const SECTIONS = [
  { key: 'mission', titleEn: 'Our Mission', titleAz: 'Bizim Missiyamız', icon: '🎯' },
  { key: 'history', titleEn: 'Our History', titleAz: 'Tarixçəmiz', icon: '📜' },
  { key: 'team', titleEn: 'Our Team', titleAz: 'Komandamız', icon: '👥' },
  { key: 'contact', titleEn: 'Contact Us', titleAz: 'Bizimlə Əlaqə', icon: '📧' },
];

const AboutUsEditor: React.FC = () => {
  const { t } = useTranslation();
  const [content, setContent] = useState<AboutContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContentAz, setEditContentAz] = useState('');
  const [editContentEn, setEditContentEn] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await adminAboutUsApi.getContent();
      setContent(response.content || []);
    } catch (error) {
      console.error('Error fetching about us content:', error);
      setMessage({ type: 'error', text: t('aboutUsEditor.contentLoadFailed') });
    } finally {
      setLoading(false);
    }
  };

  const getContentForSection = (sectionKey: string): AboutContent | undefined => {
    return content.find(c => c.sectionKey === sectionKey);
  };

  const startEditing = (sectionKey: string) => {
    const existingContent = getContentForSection(sectionKey);
    setEditingSection(sectionKey);
    setEditContentAz(existingContent?.contentAz || '');
    setEditContentEn(existingContent?.contentEn || '');
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditContentAz('');
    setEditContentEn('');
  };

  const saveSection = async () => {
    if (!editingSection) return;

    try {
      setSaving(editingSection);
      await adminAboutUsApi.updateSection(editingSection, editContentAz, editContentEn);
      setMessage({ type: 'success', text: t('aboutUsEditor.contentSaved') });
      await fetchContent();
      setEditingSection(null);
    } catch (error) {
      console.error('Error saving content:', error);
      setMessage({ type: 'error', text: t('aboutUsEditor.contentSaveFailed') });
    } finally {
      setSaving(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="about-us-editor">
      <div className="editor-header">
        <div>
          <h1>{t('aboutUsEditor.title')}</h1>
        </div>
        <a href="/about" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          {t('aboutUsEditor.previewPage')}
        </a>
      </div>

      {message && (
        <div className={`editor-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="loading">{t('aboutUsEditor.loadingContent')}</div>
      ) : (
        <div className="sections-list">
          {SECTIONS.map(section => {
            const existingContent = getContentForSection(section.key);
            const isEditing = editingSection === section.key;

            return (
              <div key={section.key} className={`section-card ${isEditing ? 'editing' : ''}`}>
                <div className="section-header">
                  <h2>
                    <span className="section-icon">{section.icon}</span>
                    {t(`about.${section.key}`)}
                  </h2>
                  {!isEditing && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => startEditing(section.key)}
                    >
                      {t('aboutUsEditor.edit')}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>{t('aboutUsEditor.contentEn')}</label>
                      <textarea
                        value={editContentEn}
                        onChange={(e) => setEditContentEn(e.target.value)}
                        placeholder={t('aboutUsEditor.placeholderEn')}
                        rows={6}
                      />
                    </div>
                    <div className="form-group">
                      <label>{t('aboutUsEditor.contentAz')}</label>
                      <textarea
                        value={editContentAz}
                        onChange={(e) => setEditContentAz(e.target.value)}
                        placeholder={t('aboutUsEditor.placeholderAz')}
                        rows={6}
                      />
                    </div>
                    <div className="edit-actions">
                      <button
                        className="btn btn-primary"
                        onClick={saveSection}
                        disabled={saving === section.key}
                      >
                        {saving === section.key ? t('aboutUsEditor.saving') : t('aboutUsEditor.saveChanges')}
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={cancelEditing}
                        disabled={saving === section.key}
                      >
                        {t('aboutUsEditor.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="section-preview">
                    {existingContent ? (
                      <>
                        <div className="preview-content">
                          <strong>English:</strong>
                          <p>{existingContent.contentEn || <em>{t('aboutUsEditor.noContent')}</em>}</p>
                        </div>
                        <div className="preview-content">
                          <strong>Azerbaijani:</strong>
                          <p>{existingContent.contentAz || <em>{t('aboutUsEditor.noContent')}</em>}</p>
                        </div>
                        <div className="section-meta">
                          {t('aboutUsEditor.lastUpdated', { date: formatDate(existingContent.updatedAt) })}
                          {existingContent.updatedBy && (
                            <> {t('aboutUsEditor.lastUpdatedBy', { name: `${existingContent.updatedBy.firstName} ${existingContent.updatedBy.lastName}` })}</>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="no-content">{t('aboutUsEditor.noContentHint')}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AboutUsEditor;
