import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      setMessage({ type: 'error', text: 'Failed to load content' });
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
      setMessage({ type: 'success', text: 'Content saved successfully!' });
      await fetchContent();
      setEditingSection(null);
    } catch (error) {
      console.error('Error saving content:', error);
      setMessage({ type: 'error', text: 'Failed to save content' });
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
          <h1>About Us Editor</h1>
          <Link to="/admin" className="back-link">← Back to Dashboard</Link>
        </div>
        <a href="/about" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          Preview Public Page
        </a>
      </div>

      {message && (
        <div className={`editor-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading content...</div>
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
                    {section.titleEn}
                  </h2>
                  {!isEditing && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => startEditing(section.key)}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Content (English)</label>
                      <textarea
                        value={editContentEn}
                        onChange={(e) => setEditContentEn(e.target.value)}
                        placeholder="Enter content in English..."
                        rows={6}
                      />
                    </div>
                    <div className="form-group">
                      <label>Content (Azerbaijani)</label>
                      <textarea
                        value={editContentAz}
                        onChange={(e) => setEditContentAz(e.target.value)}
                        placeholder="Azərbaycan dilində məzmun daxil edin..."
                        rows={6}
                      />
                    </div>
                    <div className="edit-actions">
                      <button
                        className="btn btn-primary"
                        onClick={saveSection}
                        disabled={saving === section.key}
                      >
                        {saving === section.key ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={cancelEditing}
                        disabled={saving === section.key}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="section-preview">
                    {existingContent ? (
                      <>
                        <div className="preview-content">
                          <strong>English:</strong>
                          <p>{existingContent.contentEn || <em>No content</em>}</p>
                        </div>
                        <div className="preview-content">
                          <strong>Azerbaijani:</strong>
                          <p>{existingContent.contentAz || <em>No content</em>}</p>
                        </div>
                        <div className="section-meta">
                          Last updated: {formatDate(existingContent.updatedAt)}
                          {existingContent.updatedBy && (
                            <> by {existingContent.updatedBy.firstName} {existingContent.updatedBy.lastName}</>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="no-content">No content yet. Click Edit to add content.</p>
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
