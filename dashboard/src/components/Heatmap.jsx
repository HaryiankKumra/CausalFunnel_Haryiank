import React, { useState, useEffect, useRef } from 'react';
import { getTrackedPages, getHeatmap, getPageScores } from '../api/analytics';

export default function Heatmap() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [clickData, setClickData] = useState([]);
  const [pageScores, setPageScores] = useState([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [error, setError] = useState(null);

  // Customization controls
  const [pointRadius, setPointRadius] = useState(28);
  const [intensity, setIntensity] = useState(0.7);
  const [showPoints, setShowPoints] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const canvasRef = useRef(null);

  // Load available pages on mount
  useEffect(() => {
    loadPages();
    loadScores();
  }, []);

  useEffect(() => {
    const onReset = () => {
      setClickData([]);
      setPageScores([]);
      loadPages();
      loadScores();
    };
    window.addEventListener('causalpulse:reset', onReset);
    return () => window.removeEventListener('causalpulse:reset', onReset);
  }, []);

  async function loadPages() {
    setLoadingPages(true);
    setError(null);
    try {
      const data = await getTrackedPages();
      const pageList = data.pages || [];
      setPages(pageList);
      setSelectedPage((currentPage) =>
        pageList.includes(currentPage) ? currentPage : pageList[0] || ''
      );
    } catch (err) {
      setError(`Failed to fetch tracked pages: ${err.message}`);
    } finally {
      setLoadingPages(false);
    }
  }

  async function loadScores() {
    try {
      const data = await getPageScores();
      setPageScores(data.pages || []);
    } catch (err) {
      setError(`Failed to fetch page scores: ${err.message}`);
    }
  }

  // Fetch heatmap data when selectedPage changes
  useEffect(() => {
    if (!selectedPage) {
      setClickData([]);
      return;
    }

    async function fetchHeatmapData() {
      setLoadingHeatmap(true);
      setError(null);
      try {
        const data = await getHeatmap(selectedPage);
        setClickData(data.clicks || []);
      } catch (err) {
        setError(`Failed to load click data: ${err.message}`);
        setClickData([]);
      } finally {
        setLoadingHeatmap(false);
      }
    }

    fetchHeatmapData();
  }, [selectedPage]);

  // Render heatmap onto HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!clickData || clickData.length === 0) return;

    // 3. Render Heatmap layer using offscreen density accumulation
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = width;
    heatCanvas.height = height;
    const heatCtx = heatCanvas.getContext('2d');

    // Set additive blending so overlapping clicks produce intense heat spots
    heatCtx.globalCompositeOperation = 'lighter';

    // Draw radial alpha spots for each click with coordinate normalization
    clickData.forEach((click) => {
      if (click.x == null || click.y == null) return;

      // Coordinate normalization: scale relative to the recorded viewport
      const vpWidth = click.viewport_width || width;
      const vpHeight = click.viewport_height || height;

      const normX = (click.x / vpWidth) * width;
      const normY = (click.y / vpHeight) * height;

      const radGrad = heatCtx.createRadialGradient(
        normX,
        normY,
        0,
        normX,
        normY,
        pointRadius
      );
      radGrad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
      radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      heatCtx.fillStyle = radGrad;
      heatCtx.beginPath();
      heatCtx.arc(normX, normY, pointRadius, 0, Math.PI * 2);
      heatCtx.fill();
    });

    // 4. Colorize the density map with a smooth thermal color palette
    // Palette gradient: transparent blue -> cyan -> lime -> yellow -> orange -> red
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const paletteCtx = paletteCanvas.getContext('2d');
    const grad = paletteCtx.createLinearGradient(0, 0, 256, 1);
    grad.addColorStop(0.0, 'rgba(0, 0, 255, 0)');
    grad.addColorStop(0.2, 'rgba(0, 220, 255, 0.6)');
    grad.addColorStop(0.45, 'rgba(0, 255, 100, 0.75)');
    grad.addColorStop(0.7, 'rgba(255, 220, 0, 0.85)');
    grad.addColorStop(0.88, 'rgba(255, 90, 0, 0.95)');
    grad.addColorStop(1.0, 'rgba(255, 0, 0, 1.0)');
    paletteCtx.fillStyle = grad;
    paletteCtx.fillRect(0, 0, 256, 1);
    const palette = paletteCtx.getImageData(0, 0, 256, 1).data;

    const heatImg = heatCtx.getImageData(0, 0, width, height);
    const heatPixels = heatImg.data;

    for (let i = 0; i < heatPixels.length; i += 4) {
      const alpha = heatPixels[i + 3];
      if (alpha > 0) {
        const pIndex = alpha * 4;
        heatPixels[i] = palette[pIndex]; // R
        heatPixels[i + 1] = palette[pIndex + 1]; // G
        heatPixels[i + 2] = palette[pIndex + 2]; // B
        heatPixels[i + 3] = Math.min(240, alpha * 1.3); // A
      }
    }

    heatCtx.putImageData(heatImg, 0, 0);

    // Composite heat map onto main canvas
    ctx.drawImage(heatCanvas, 0, 0);

    // 5. Optionally draw discrete click dots with target crosshairs
    if (showPoints) {
      clickData.forEach((click, idx) => {
        if (click.x == null || click.y == null) return;
        const vpWidth = click.viewport_width || width;
        const vpHeight = click.viewport_height || height;
        const normX = (click.x / vpWidth) * width;
        const normY = (click.y / vpHeight) * height;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(normX, normY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }, [clickData, pointRadius, intensity, showPoints]);

  const currentScore = pageScores.find((page) => page.page_url === selectedPage);
  const isDemoPage = selectedPage.includes('/demo/');
  const demoPreviewUrl = selectedPage ? new URL('preview.svg', selectedPage).href : '';

  // Handle Canvas mouse move for inspector tooltip
  function handleCanvasMouseMove(e) {
    const canvas = canvasRef.current;
    if (!canvas || clickData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Find nearest click within 30px
    let closest = null;
    let minDist = 30;

    clickData.forEach((click) => {
      if (click.x == null || click.y == null) return;
      const vpWidth = click.viewport_width || canvas.width;
      const vpHeight = click.viewport_height || canvas.height;
      const normX = (click.x / vpWidth) * canvas.width;
      const normY = (click.y / vpHeight) * canvas.height;

      const dist = Math.hypot(normX - mouseX, normY - mouseY);
      if (dist < minDist) {
        minDist = dist;
        closest = { ...click, normX, normY };
      }
    });

    setHoveredPoint(closest);
  }

  return (
    <div className="heatmap-container" id="heatmap-view">
      {/* Controls Bar */}
      <div className="card-panel heatmap-controls-panel">
        <div className="controls-row">
          <div className="page-selector-group">
            <label htmlFor="heatmap-page-select" className="control-label">
              Select Tracked Page URL:
            </label>
            <div className="select-wrapper">
              <select
                id="heatmap-page-select"
                className="select-input"
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                disabled={loadingPages || pages.length === 0}
              >
                {pages.length === 0 ? (
                  <option value="">No pages tracked yet</option>
                ) : (
                  pages.map((url) => (
                    <option key={url} value={url}>
                      {url}
                    </option>
                  ))
                )}
              </select>
              <button
                className="btn-refresh-pages"
                onClick={loadPages}
                title="Refresh tracked pages list"
                aria-label="Refresh tracked pages"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="heatmap-metrics-summary">
            <div className="metric-badge">
              <span className="metric-label">Total Clicks:</span>
              <span className="metric-val">{clickData.length}</span>
            </div>
            <div className="metric-badge score-badge">
              <span className="metric-label">Engagement score:</span>
              <strong className="metric-score">{currentScore?.score ?? '—'}</strong>
              <span className="metric-label">/ 100</span>
            </div>
            <div className="metric-badge">
              <span className="metric-label">Render Resolution:</span>
              <span className="metric-val">1000 × 650</span>
            </div>
          </div>
        </div>

        {/* Sliders and Toggles */}
        <div className="sliders-row">
          <div className="slider-group">
            <label className="slider-label">
              Heat Radius: <span>{pointRadius}px</span>
            </label>
            <input
              type="range"
              min="15"
              max="60"
              value={pointRadius}
              onChange={(e) => setPointRadius(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="slider-group">
            <label className="slider-label">
              Intensity: <span>{Math.round(intensity * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="range-slider"
            />
          </div>

          <div className="toggle-group">
            <label className="toggle-checkbox-label">
              <input
                type="checkbox"
                checked={showPoints}
                onChange={(e) => setShowPoints(e.target.checked)}
              />
              Show Click Points
            </label>
          </div>
        </div>
      </div>

      {/* States */}
      {loadingHeatmap && (
        <div className="state-card loading-state">
          <div className="spinner"></div>
          <p>Generating click heatmap...</p>
        </div>
      )}

      {error && (
        <div className="state-card error-state">
          <span className="state-icon">⚠️</span>
          <h3>Heatmap Error</h3>
          <p>{error}</p>
        </div>
      )}

      {!loadingHeatmap && !error && clickData.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📍</span>
          <h3>No click data for this URL</h3>
          <p>
            No clicks recorded on <code>{selectedPage || 'this URL'}</code> yet. Click on the demo
            webpage to populate this heatmap.
          </p>
        </div>
      )}

      {/* Canvas Visualization Frame */}
      <div className="canvas-frame">
        <div className="canvas-header-bar">
          <div className="canvas-dots">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
          </div>
          <span className="canvas-url-preview">{selectedPage || 'Visualization Canvas'}</span>
          <div className="canvas-legend">
            <span>Low</span>
            <div className="legend-gradient"></div>
            <span>High Density</span>
          </div>
        </div>

        <div
          className={`canvas-wrapper ${isDemoPage ? 'has-page-preview' : ''}`}
          style={isDemoPage ? { backgroundImage: `url("${demoPreviewUrl}")` } : undefined}
        >
          {!isDemoPage && <div className="preview-placeholder">Live preview unavailable for this URL</div>}
          <canvas
            ref={canvasRef}
            width={1000}
            height={650}
            className="heatmap-canvas"
            aria-label={`Click heatmap for ${selectedPage || 'tracked pages'}`}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
          />

          {hoveredPoint && (
            <div
              className="canvas-tooltip"
              style={{
                left: `${(hoveredPoint.normX / 1000) * 100}%`,
                top: `${(hoveredPoint.normY / 650) * 100}%`,
              }}
            >
              <div className="tooltip-title">🎯 Click Event</div>
              <div>Raw: X={hoveredPoint.x}px, Y={hoveredPoint.y}px</div>
              <div>Viewport: {hoveredPoint.viewport_width}×{hoveredPoint.viewport_height}</div>
              <div>Time: {new Date(hoveredPoint.timestamp).toLocaleTimeString()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
