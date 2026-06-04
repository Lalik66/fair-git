import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getVendorAnalytics,
  AnalyticsSummary,
} from '../services/analyticsService';
import './AnalyticsDashboard.css';

const RANGE_OPTIONS = [1, 7, 30] as const;

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getVendorAnalytics(days)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.message || 'Failed to load');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const peakHour = data
    ? data.hourBuckets.reduce(
        (best, count, hour) => (count > best.count ? { hour, count } : best),
        { hour: -1, count: 0 },
      )
    : null;

  const maxBucket = data
    ? Math.max(1, ...data.hourBuckets)
    : 1;

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h2>{t('analytics.title', 'Vendor click analytics')}</h2>
          <p className="lede">
            {t(
              'analytics.subtitle',
              'How many visitors tapped each vendor house and when. Popup opens = pure interest; directions taps = visitors who walked there.',
            )}
          </p>
        </div>
        <div className="range-switch">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={opt === days ? 'on' : ''}
              onClick={() => setDays(opt)}
            >
              {opt === 1
                ? t('analytics.range.day', '24h')
                : opt === 7
                  ? t('analytics.range.week', '7d')
                  : t('analytics.range.month', '30d')}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="analytics-state">{t('common.loading', 'Loading...')}</div>}
      {error && <div className="analytics-state error">{error}</div>}

      {!loading && !error && data && (
        <>
          <div className="analytics-kpis">
            <div className="kpi">
              <div className="k">{t('analytics.totalClicks', 'Total taps')}</div>
              <div className="v">{data.totalClicks}</div>
              <div className="d">
                {t('analytics.window', { days, defaultValue: `last ${days} day(s)` })}
              </div>
            </div>
            <div className="kpi">
              <div className="k">{t('analytics.uniqueHouses', 'Houses with taps')}</div>
              <div className="v">{data.houses.length}</div>
              <div className="d">{t('analytics.outOfTotal', 'of all enabled houses')}</div>
            </div>
            <div className="kpi">
              <div className="k">{t('analytics.peakHour', 'Peak hour')}</div>
              <div className="v">
                {peakHour && peakHour.hour >= 0 ? `${peakHour.hour}:00` : '—'}
              </div>
              <div className="d">
                {peakHour && peakHour.count > 0
                  ? t('analytics.peakHourCount', { count: peakHour.count, defaultValue: `${peakHour.count} taps` })
                  : t('analytics.noData', 'no data yet')}
              </div>
            </div>
          </div>

          <section className="analytics-section">
            <h3>{t('analytics.hourly', 'Activity by hour of day')}</h3>
            <div className="hour-chart" role="img" aria-label="Hour-of-day histogram">
              {data.hourBuckets.map((count, hour) => {
                const pct = Math.round((count / maxBucket) * 100);
                return (
                  <div className="hour-col" key={hour} title={`${hour}:00 — ${count} ${t('analytics.tapsShort', 'taps')}`}>
                    <div className="bar" style={{ height: `${pct}%` }} />
                    <div className="hour-label">{hour}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="analytics-section">
            <h3>{t('analytics.topHouses', 'Top vendor houses')}</h3>
            {data.houses.length === 0 ? (
              <div className="analytics-state">{t('analytics.noData', 'No data yet — visitors will start showing up here as they tap houses on the map.')}</div>
            ) : (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('analytics.house', 'House')}</th>
                    <th>{t('analytics.popupOpens', 'Popup opens')}</th>
                    <th>{t('analytics.directionsTaps', 'Directions taps')}</th>
                    <th>{t('analytics.total', 'Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.houses.map((row, idx) => (
                    <tr key={row.vendorHouseId}>
                      <td className="rank">{idx + 1}</td>
                      <td>{row.houseNumber}</td>
                      <td>{row.popupOpens}</td>
                      <td>{row.directionsTaps}</td>
                      <td className="total">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
