import React, { useState, useCallback } from 'react';

// Time Elements Data
const timeElements = {
  travel: {
    name: 'Travel',
    color: '#8b5cf6',
    elements: [
      { id: 'TRV-WALK-FT', name: 'Walk (per foot)', time: 0.035, unit: 'per_foot', icon: '═══', hasVars: true },
      { id: 'TRV-WALK-STEP', name: 'Walk (per step)', time: 0.55, unit: 'per_step', icon: '═══', hasVars: true },
      { id: 'TRV-TURN-90', name: 'Turn 90°', time: 0.4, unit: 'fixed', icon: '↻' },
      { id: 'TRV-TURN-180', name: 'Turn 180°', time: 0.7, unit: 'fixed', icon: '↺' },
      { id: 'TRV-DOOR', name: 'Pass through door', time: 3.5, unit: 'fixed', icon: '🚪' },
    ]
  },
  body: {
    name: 'Body Motion',
    color: '#f59e0b',
    elements: [
      { id: 'BDY-REACH-S', name: 'Reach (short <12")', time: 0.35, unit: 'fixed', icon: '↗' },
      { id: 'BDY-REACH-M', name: 'Reach (medium)', time: 0.55, unit: 'fixed', icon: '↗' },
      { id: 'BDY-BEND', name: 'Bend at waist', time: 1.1, unit: 'fixed', icon: '↓' },
      { id: 'BDY-ARISE-BEND', name: 'Arise from bend', time: 1.1, unit: 'fixed', icon: '↑' },
      { id: 'BDY-STOOP', name: 'Stoop (deep bend)', time: 1.5, unit: 'fixed', icon: '⤵' },
      { id: 'BDY-KNEEL-1', name: 'Kneel (one knee)', time: 1.0, unit: 'fixed', icon: '◊' },
      { id: 'BDY-LOOK', name: 'Look/search visually', time: 0.8, unit: 'fixed', icon: '👁' },
    ]
  },
  pickEach: {
    name: 'Picking - Each',
    color: '#22c55e',
    elements: [
      { id: 'PCK-E-LOCATE', name: 'Identify slot location', time: 0.6, unit: 'fixed', icon: '📍' },
      { id: 'PCK-E-GRASP-S', name: 'Grasp small item', time: 0.5, unit: 'fixed', icon: '🫳' },
      { id: 'PCK-E-GRASP-M', name: 'Grasp medium item', time: 0.8, unit: 'fixed', icon: '🫳' },
      { id: 'PCK-E-GRASP-AWK', name: 'Grasp awkward item', time: 1.2, unit: 'fixed', icon: '🫳' },
      { id: 'PCK-E-REL-TOTE', name: 'Release to tote', time: 0.4, unit: 'fixed', icon: '📦' },
      { id: 'PCK-E-PLACE-CARE', name: 'Place carefully', time: 0.9, unit: 'fixed', icon: '📦' },
      { id: 'PCK-E-COUNT', name: 'Count quantity', time: 0.4, unit: 'per_unit', icon: '🔢', hasVars: true },
    ]
  },
  pickCase: {
    name: 'Picking - Case',
    color: '#06b6d4',
    elements: [
      { id: 'PCK-C-LOCATE', name: 'Identify case location', time: 0.6, unit: 'fixed', icon: '📍' },
      { id: 'PCK-C-GRASP-L', name: 'Grasp case (light)', time: 1.5, unit: 'fixed', icon: '📦' },
      { id: 'PCK-C-GRASP-M', name: 'Grasp case (medium)', time: 2.2, unit: 'fixed', icon: '📦' },
      { id: 'PCK-C-GRASP-H', name: 'Grasp case (heavy)', time: 3.2, unit: 'fixed', icon: '📦' },
      { id: 'PCK-C-PLACE-T1', name: 'Place - Floor tier', time: 2.0, unit: 'fixed', icon: '⬇' },
      { id: 'PCK-C-PLACE-T2', name: 'Place - Middle tier', time: 2.5, unit: 'fixed', icon: '➡' },
      { id: 'PCK-C-PLACE-T3', name: 'Place - Top tier', time: 3.2, unit: 'fixed', icon: '⬆' },
    ]
  },
  confirm: {
    name: 'Confirmation',
    color: '#3b82f6',
    elements: [
      { id: 'CNF-RF-GET', name: 'RF scan - Get device', time: 1.5, unit: 'fixed', icon: '📱' },
      { id: 'CNF-RF-SCAN', name: 'RF scan - Scan', time: 2.5, unit: 'fixed', icon: '📱' },
      { id: 'CNF-RF-RET', name: 'RF scan - Return', time: 1.0, unit: 'fixed', icon: '📱' },
      { id: 'CNF-WEAR-SCAN', name: 'RF wearable scan', time: 1.2, unit: 'fixed', icon: '⌚' },
      { id: 'CNF-RF-READ', name: 'RF - Read screen', time: 1.0, unit: 'fixed', icon: '👁' },
      { id: 'CNF-VOICE-LISTEN', name: 'Voice - Listen', time: 1.5, unit: 'fixed', icon: '🎧' },
      { id: 'CNF-VOICE-CONF', name: 'Voice - Confirm', time: 1.8, unit: 'fixed', icon: '🎤' },
      { id: 'CNF-PTL-CONF', name: 'Pick-to-light confirm', time: 0.6, unit: 'fixed', icon: '💡' },
    ]
  },
  equipment: {
    name: 'Access Equipment',
    color: '#ec4899',
    elements: [
      { id: 'EQP-STOOL-GET', name: 'Step stool - Get', time: 3.0, unit: 'fixed', icon: '🪜' },
      { id: 'EQP-STOOL-POS', name: 'Step stool - Position', time: 2.0, unit: 'fixed', icon: '🪜' },
      { id: 'EQP-STOOL-UP', name: 'Step stool - Mount', time: 1.0, unit: 'fixed', icon: '⬆' },
      { id: 'EQP-STOOL-DOWN', name: 'Step stool - Dismount', time: 0.8, unit: 'fixed', icon: '⬇' },
      { id: 'EQP-LADR-CLIMB', name: 'Ladder climb (per rung)', time: 1.1, unit: 'per_rung', icon: '🪜', hasVars: true },
      { id: 'EQP-LADR-DESC', name: 'Ladder descend (per rung)', time: 0.9, unit: 'per_rung', icon: '🪜', hasVars: true },
    ]
  },
};

// Sample timeline
const sampleTimeline = [
  { id: 1, elementId: 'TRV-WALK-FT', name: 'Walk to slot', time: null, isAuto: true, autoLabel: 'FROM HEATMAP' },
  { id: 2, elementId: 'PCK-E-LOCATE', name: 'Identify slot location', time: 0.6 },
  { id: 3, elementId: 'CNF-RF-READ', name: 'RF scan - Read screen', time: 1.0 },
  { id: 4, elementId: 'BDY-BEND', name: 'Bend at waist', time: 1.1, isConditional: true, condition: 'Slot level = Floor' },
  { id: 5, elementId: 'BDY-REACH-M', name: 'Reach medium', time: 0.55 },
  { id: 6, elementId: 'PCK-E-GRASP-M', name: 'Grasp medium item', time: 0.8 },
  { id: 7, elementId: 'BDY-ARISE-BEND', name: 'Arise from bend', time: 1.1, isConditional: true, condition: 'Slot level = Floor' },
  { id: 8, elementId: 'PCK-E-PLACE-CARE', name: 'Place in tote', time: 0.9 },
  { id: 9, elementId: 'CNF-WEAR-SCAN', name: 'RF wearable scan', time: 1.2 },
];

const ElementCard = ({ element, categoryColor, onDragStart }) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, element)}
    className="group cursor-grab active:cursor-grabbing"
    style={{
      background: 'linear-gradient(135deg, #1e1e24 0%, #16161a 100%)',
      border: '1px solid #2a2a32',
      borderRadius: '8px',
      padding: '10px 12px',
      marginBottom: '6px',
      transition: 'all 0.2s ease',
      borderLeft: `3px solid ${categoryColor}`,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateX(4px)';
      e.currentTarget.style.borderColor = categoryColor;
      e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px ${categoryColor}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateX(0)';
      e.currentTarget.style.borderColor = '#2a2a32';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span style={{ opacity: 0.6 }}>≡</span>
        <span className="text-lg mr-1">{element.icon}</span>
        <span style={{ color: '#e4e4e7', fontSize: '13px', fontWeight: 500 }}>{element.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ 
          color: '#22c55e', 
          fontFamily: 'JetBrains Mono, monospace', 
          fontSize: '12px',
          fontWeight: 600 
        }}>
          {element.time}s
        </span>
        {element.hasVars && (
          <span style={{ 
            background: '#3b82f620', 
            color: '#3b82f6', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600
          }}>
            📏 vars
          </span>
        )}
      </div>
    </div>
  </div>
);

const TimelineItem = ({ item, index, onRemove, onConfigClick }) => {
  const getCategoryColor = () => {
    if (item.elementId.startsWith('TRV')) return '#8b5cf6';
    if (item.elementId.startsWith('BDY')) return '#f59e0b';
    if (item.elementId.startsWith('PCK-E')) return '#22c55e';
    if (item.elementId.startsWith('PCK-C')) return '#06b6d4';
    if (item.elementId.startsWith('CNF')) return '#3b82f6';
    if (item.elementId.startsWith('EQP')) return '#ec4899';
    return '#6b7280';
  };

  return (
    <div 
      className="group"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        marginBottom: '2px',
      }}
    >
      {/* Timeline connector */}
      <div style={{ 
        width: '24px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        marginRight: '8px'
      }}>
        <div style={{ 
          width: '2px', 
          flex: 1, 
          background: index === 0 ? 'transparent' : '#3f3f46' 
        }} />
        <div style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          background: getCategoryColor(),
          border: '2px solid #18181b',
          flexShrink: 0
        }} />
        <div style={{ 
          width: '2px', 
          flex: 1, 
          background: '#3f3f46' 
        }} />
      </div>

      {/* Content */}
      <div 
        onClick={() => onConfigClick(item)}
        style={{
          flex: 1,
          background: item.isConditional ? '#1a1a2e' : '#1e1e24',
          border: `1px solid ${item.isConditional ? '#3b82f640' : '#2a2a32'}`,
          borderLeft: `3px solid ${getCategoryColor()}`,
          borderRadius: '6px',
          padding: '10px 14px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = getCategoryColor();
          e.currentTarget.style.background = '#242430';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = item.isConditional ? '#3b82f640' : '#2a2a32';
          e.currentTarget.style.background = item.isConditional ? '#1a1a2e' : '#1e1e24';
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ 
              color: '#6b7280', 
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              minWidth: '20px'
            }}>
              {index + 1}.
            </span>
            <span style={{ color: '#e4e4e7', fontSize: '13px' }}>{item.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {item.isConditional && (
              <span style={{
                background: '#3b82f620',
                color: '#60a5fa',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 500
              }}>
                CONDITIONAL
              </span>
            )}
            {item.isAuto ? (
              <span style={{
                background: '#8b5cf620',
                color: '#a78bfa',
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                ▸ {item.autoLabel}
              </span>
            ) : (
              <span style={{
                color: '#22c55e',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                fontWeight: 600,
                minWidth: '50px',
                textAlign: 'right'
              }}>
                {item.time}s
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              style={{
                opacity: 0,
                color: '#ef4444',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
                transition: 'opacity 0.15s'
              }}
              className="group-hover:opacity-100"
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            >
              ×
            </button>
          </div>
        </div>
        {item.isConditional && item.condition && (
          <div style={{ 
            marginTop: '6px', 
            marginLeft: '28px',
            color: '#6b7280',
            fontSize: '11px'
          }}>
            └ Apply when: {item.condition}
          </div>
        )}
      </div>
    </div>
  );
};

export default function LaborStandardsBuilder() {
  const [expandedCategories, setExpandedCategories] = useState(['pickEach', 'confirm', 'body']);
  const [timeline, setTimeline] = useState(sampleTimeline);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateName, setTemplateName] = useState('Standard Each Pick - RF Wearable');
  const [dragOver, setDragOver] = useState(false);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleDragStart = (e, element) => {
    e.dataTransfer.setData('element', JSON.stringify(element));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const element = JSON.parse(e.dataTransfer.getData('element'));
    const newItem = {
      id: Date.now(),
      elementId: element.id,
      name: element.name,
      time: element.time,
      isAuto: element.id === 'TRV-WALK-FT',
      autoLabel: element.id === 'TRV-WALK-FT' ? 'FROM HEATMAP' : null,
    };
    setTimeline([...timeline, newItem]);
  };

  const removeItem = (id) => {
    setTimeline(timeline.filter(item => item.id !== id));
  };

  // Calculate totals
  const fixedTime = timeline
    .filter(item => !item.isConditional && !item.isAuto && item.time)
    .reduce((sum, item) => sum + item.time, 0);
  
  const conditionalTime = timeline
    .filter(item => item.isConditional && item.time)
    .reduce((sum, item) => sum + item.time, 0);

  const picksPerHourBase = Math.round(3600 / fixedTime);
  const picksPerHourWithConditional = Math.round(3600 / (fixedTime + conditionalTime));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #09090b 0%, #0f0f12 100%)',
      color: '#e4e4e7',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '24px',
        borderBottom: '1px solid #27272a',
        paddingBottom: '20px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '0.5px'
          }}>
            ELS
          </div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 700,
            background: 'linear-gradient(90deg, #e4e4e7 0%, #a1a1aa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Engineered Labor Standards Builder
          </h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Build professional-grade picking standards in minutes, not months
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Left Panel - Element Library */}
        <div style={{
          width: '340px',
          flexShrink: 0,
          background: '#111114',
          borderRadius: '12px',
          border: '1px solid #27272a',
          padding: '16px',
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.5px' }}>
              ELEMENT LIBRARY
            </h2>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>85 elements</span>
          </div>

          {/* Search */}
          <div style={{
            background: '#1e1e24',
            border: '1px solid #2a2a32',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ color: '#6b7280' }}>🔍</span>
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e4e4e7',
                fontSize: '13px',
                width: '100%'
              }}
            />
          </div>

          {/* Categories */}
          {Object.entries(timeElements).map(([key, category]) => (
            <div key={key} style={{ marginBottom: '8px' }}>
              <button
                onClick={() => toggleCategory(key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: expandedCategories.includes(key) ? '#1a1a1f' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  color: '#e4e4e7'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1f'}
                onMouseLeave={(e) => {
                  if (!expandedCategories.includes(key)) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ 
                    color: expandedCategories.includes(key) ? '#e4e4e7' : '#6b7280',
                    transition: 'transform 0.2s',
                    transform: expandedCategories.includes(key) ? 'rotate(90deg)' : 'rotate(0)'
                  }}>
                    ▶
                  </span>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: category.color
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{category.name}</span>
                </div>
                <span style={{ 
                  fontSize: '11px', 
                  color: '#6b7280',
                  background: '#27272a',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {category.elements.length}
                </span>
              </button>
              
              {expandedCategories.includes(key) && (
                <div style={{ paddingLeft: '8px', paddingTop: '8px' }}>
                  {category.elements
                    .filter(el => el.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(element => (
                      <ElementCard 
                        key={element.id}
                        element={element}
                        categoryColor={category.color}
                        onDragStart={handleDragStart}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Panel - Process Designer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Template Header */}
          <div style={{
            background: '#111114',
            borderRadius: '12px',
            border: '1px solid #27272a',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>Template:</span>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{
                  background: '#1e1e24',
                  border: '1px solid #2a2a32',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#e4e4e7',
                  fontSize: '14px',
                  fontWeight: 500,
                  width: '380px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                background: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#e4e4e7',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}>
                Save As
              </button>
              <button style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                color: 'white',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                Save Template
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div style={{
            background: '#111114',
            borderRadius: '12px',
            border: '1px solid #27272a',
            padding: '20px',
            flex: 1
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.5px' }}>
                PICK CYCLE TIMELINE
              </h2>
              <button 
                onClick={() => setTimeline([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🗑️ Clear All
              </button>
            </div>

            {/* Start marker */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '8px',
              marginLeft: '7px'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '2px solid #18181b'
              }} />
              <span style={{ 
                color: '#22c55e', 
                fontSize: '11px', 
                fontWeight: 600,
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                ● START
              </span>
              <span style={{ 
                color: '#6b7280', 
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                0.0s
              </span>
            </div>

            {/* Timeline items */}
            <div style={{ marginLeft: '0px' }}>
              {timeline.map((item, index) => (
                <TimelineItem 
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={removeItem}
                  onConfigClick={(item) => console.log('Configure:', item)}
                />
              ))}
            </div>

            {/* End marker */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginTop: '8px',
              marginLeft: '7px'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '2px solid #18181b'
              }} />
              <span style={{ 
                color: '#ef4444', 
                fontSize: '11px', 
                fontWeight: 600,
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                ● END
              </span>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                marginTop: '20px',
                border: `2px dashed ${dragOver ? '#3b82f6' : '#3f3f46'}`,
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                background: dragOver ? '#3b82f610' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ 
                color: dragOver ? '#3b82f6' : '#6b7280',
                fontSize: '13px'
              }}>
                ⬇️ Drop elements here to add to timeline ⬇️
              </span>
            </div>
          </div>

          {/* Running Totals */}
          <div style={{
            background: '#111114',
            borderRadius: '12px',
            border: '1px solid #27272a',
            padding: '20px'
          }}>
            <h2 style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#a1a1aa', 
              letterSpacing: '0.5px',
              marginBottom: '16px'
            }}>
              RUNNING TOTALS
            </h2>

            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Time breakdown */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  padding: '8px 0',
                  borderBottom: '1px solid #27272a'
                }}>
                  <span style={{ color: '#a1a1aa', fontSize: '13px' }}>Fixed Elements:</span>
                  <span style={{ 
                    color: '#22c55e', 
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600
                  }}>
                    {fixedTime.toFixed(2)}s
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  padding: '8px 0',
                  borderBottom: '1px solid #27272a'
                }}>
                  <span style={{ color: '#a1a1aa', fontSize: '13px' }}>Conditional Elements:</span>
                  <span style={{ 
                    color: '#60a5fa', 
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600
                  }}>
                    +{conditionalTime.toFixed(2)}s
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #27272a'
                }}>
                  <span style={{ color: '#a1a1aa', fontSize: '13px' }}>Travel Time:</span>
                  <span style={{ 
                    color: '#a78bfa', 
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600
                  }}>
                    ▸ FROM HEATMAP
                  </span>
                </div>
              </div>

              {/* Summary cards */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
                  border: '1px solid #10b981',
                  borderRadius: '10px',
                  padding: '16px 24px',
                  textAlign: 'center',
                  minWidth: '140px'
                }}>
                  <div style={{ 
                    color: '#6ee7b7', 
                    fontSize: '11px', 
                    fontWeight: 600,
                    marginBottom: '4px',
                    letterSpacing: '0.5px'
                  }}>
                    BASE PICK TIME
                  </div>
                  <div style={{ 
                    color: '#ecfdf5',
                    fontSize: '28px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    {fixedTime.toFixed(2)}
                  </div>
                  <div style={{ color: '#6ee7b7', fontSize: '11px' }}>seconds</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #0c1929 100%)',
                  border: '1px solid #3b82f6',
                  borderRadius: '10px',
                  padding: '16px 24px',
                  textAlign: 'center',
                  minWidth: '140px'
                }}>
                  <div style={{ 
                    color: '#93c5fd', 
                    fontSize: '11px', 
                    fontWeight: 600,
                    marginBottom: '4px',
                    letterSpacing: '0.5px'
                  }}>
                    PICKS / HOUR
                  </div>
                  <div style={{ 
                    color: '#eff6ff',
                    fontSize: '28px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    ~{picksPerHourBase}
                  </div>
                  <div style={{ color: '#93c5fd', fontSize: '11px' }}>excluding travel</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)',
                  border: '1px solid #8b5cf6',
                  borderRadius: '10px',
                  padding: '16px 24px',
                  textAlign: 'center',
                  minWidth: '140px'
                }}>
                  <div style={{ 
                    color: '#c4b5fd', 
                    fontSize: '11px', 
                    fontWeight: 600,
                    marginBottom: '4px',
                    letterSpacing: '0.5px'
                  }}>
                    W/ FLOOR PICKS
                  </div>
                  <div style={{ 
                    color: '#f5f3ff',
                    fontSize: '28px',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    ~{picksPerHourWithConditional}
                  </div>
                  <div style={{ color: '#c4b5fd', fontSize: '11px' }}>picks/hour</div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#1a1a1f',
              borderRadius: '8px',
              border: '1px solid #27272a'
            }}>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                💡 Add 10-15% PF&D allowance for realistic production targets. 
                Travel time will be calculated per-pick based on your warehouse heatmap layout.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
