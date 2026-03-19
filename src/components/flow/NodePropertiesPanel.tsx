import { useState, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { X, Plus, Trash2, Download } from 'lucide-react';
import { Input } from '../ui/Input';
import { getApprovedMetaTemplates } from '../../services/templateService';
import type { FlowCondition, FlowConditionMatchType, MetaTemplate, MetaTemplateButton } from '../../types';

interface NodePropertiesPanelProps {
  node: Node | null;
  nodes: Node[];
  edges: Edge[];
  onUpdate: (nodeId: string, data: Record<string, any>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

const matchTypeOptions: { value: FlowConditionMatchType; label: string }[] = [
  { value: 'EXACT', label: 'Exact Match' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'BUTTON_ID', label: 'Button ID' },
  { value: 'LIST_ID', label: 'List ID' },
  { value: 'REGEX', label: 'Regex' },
  { value: 'DEFAULT', label: 'Default (Fallback)' },
];

const NodePropertiesPanel = ({ node, nodes, edges, onUpdate, onDelete, onClose }: NodePropertiesPanelProps) => {
  const [localData, setLocalData] = useState<Record<string, any>>({});
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  useEffect(() => {
    if (node) {
      setLocalData({ ...node.data });
    }
  }, [node?.id, node?.data]);

  // Load templates when message type is TEMPLATE
  useEffect(() => {
    if (node?.type === 'SEND_MESSAGE' && templates.length === 0) {
      setTemplatesLoading(true);
      getApprovedMetaTemplates()
        .then(setTemplates)
        .catch(console.error)
        .finally(() => setTemplatesLoading(false));
    }
  }, [node?.type]);

  if (!node) return null;

  const update = (key: string, value: any) => {
    const updated = { ...localData, [key]: value };
    setLocalData(updated);
    onUpdate(node.id, updated);
  };

  const handleDeleteNode = () => {
    if (window.confirm('Delete this node? Connected edges will also be removed.')) {
      onDelete(node.id);
    }
  };

  // Find upstream template buttons (for condition import)
  const findUpstreamTemplateButtons = (): MetaTemplateButton[] | null => {
    const incomingEdges = edges.filter(e => e.target === node.id);
    for (const edge of incomingEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      // Direct: SEND_MESSAGE → CONDITION
      if (sourceNode?.type === 'SEND_MESSAGE' && (sourceNode.data as any)?.templateButtons?.length) {
        return (sourceNode.data as any).templateButtons;
      }
      // Through WAIT: SEND_MESSAGE → WAIT → CONDITION
      if (sourceNode?.type === 'WAIT_FOR_REPLY') {
        const waitIncoming = edges.filter(e => e.target === sourceNode.id);
        for (const we of waitIncoming) {
          const msgNode = nodes.find(n => n.id === we.source);
          if (msgNode?.type === 'SEND_MESSAGE' && (msgNode.data as any)?.templateButtons?.length) {
            return (msgNode.data as any).templateButtons;
          }
        }
      }
    }
    return null;
  };

  const renderStartProps = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Trigger Type</label>
        <select
          value={localData.triggerType || 'KEYWORD'}
          onChange={(e) => update('triggerType', e.target.value)}
          className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal"
        >
          <option value="KEYWORD">Keyword</option>
          <option value="CAMPAIGN">Campaign</option>
          <option value="MANUAL">Manual</option>
        </select>
      </div>
      {(localData.triggerType === 'KEYWORD' || !localData.triggerType) && (
        <Input
          label="Keywords (comma-separated)"
          value={(localData.keywords || []).join(', ')}
          onChange={(e) => update('keywords', e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean))}
          placeholder="hi, hello, start"
        />
      )}
    </div>
  );

  const renderMessageProps = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Message Type</label>
        <select
          value={localData.messageType || 'TEXT'}
          onChange={(e) => update('messageType', e.target.value)}
          className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal"
        >
          <option value="TEXT">Text</option>
          <option value="TEMPLATE">Template</option>
          <option value="INTERACTIVE">Interactive</option>
        </select>
      </div>
      {(localData.messageType === 'TEXT' || !localData.messageType) && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Message Body</label>
          <textarea
            value={localData.text?.body || ''}
            onChange={(e) => update('text', { body: e.target.value })}
            placeholder="Type your message..."
            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal min-h-[80px] resize-y"
          />
        </div>
      )}
      {localData.messageType === 'TEMPLATE' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Select Template</label>
            {templatesLoading ? (
              <p className="text-xs text-gray-400">Loading templates...</p>
            ) : (
              <select
                value={localData.template?.templateId || ''}
                onChange={(e) => {
                  const tpl = templates.find(t => t.id === e.target.value);
                  if (tpl) {
                    // Extract QUICK_REPLY buttons
                    const buttonsComp = tpl.components?.find(c => c.type === 'BUTTONS');
                    const buttons = buttonsComp?.buttons?.filter(b => b.type === 'QUICK_REPLY') || [];
                    update('template', {
                      ...localData.template,
                      templateId: tpl.id,
                      templateName: tpl.name,
                    });
                    // Store buttons separately so condition node can import them
                    const updatedData = {
                      ...localData,
                      template: { ...localData.template, templateId: tpl.id, templateName: tpl.name },
                      templateButtons: buttons,
                    };
                    setLocalData(updatedData);
                    onUpdate(node.id, updatedData);
                  } else {
                    update('template', { ...localData.template, templateId: '', templateName: '' });
                  }
                }}
                className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal"
              >
                <option value="">Select a template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </select>
            )}
          </div>
          {localData.templateButtons?.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Template Buttons</label>
              <div className="space-y-1">
                {localData.templateButtons.map((btn: MetaTemplateButton, i: number) => (
                  <div key={i} className="text-xs bg-blue-50 border border-blue-100 px-2 py-1 rounded text-blue-700">
                    {btn.text} {btn.payload ? `(${btn.payload})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderWaitProps = () => (
    <div className="space-y-4">
      <Input
        label="Timeout (seconds)"
        type="number"
        value={localData.timeoutSeconds || ''}
        onChange={(e) => update('timeoutSeconds', e.target.value ? parseInt(e.target.value) : undefined)}
        placeholder="86400 (24 hours)"
      />
      <p className="text-xs text-gray-500">Leave empty for no timeout. 86400 = 24 hours.</p>
    </div>
  );

  const renderConditionProps = () => {
    const conditions: FlowCondition[] = localData.conditions || [];
    const upstreamButtons = findUpstreamTemplateButtons();

    const addCondition = () => {
      const id = `c${Date.now()}`;
      update('conditions', [...conditions, { id, matchType: 'EXACT', value: '', label: '' }]);
    };

    const importFromTemplate = () => {
      if (!upstreamButtons) return;
      const imported: FlowCondition[] = upstreamButtons.map((btn, i) => ({
        id: `btn_${Date.now()}_${i}`,
        matchType: 'BUTTON_ID' as FlowConditionMatchType,
        value: btn.payload || btn.text || '',
        label: btn.text || `Button ${i + 1}`,
      }));
      imported.push({
        id: `default_${Date.now()}`,
        matchType: 'DEFAULT',
        label: 'Fallback',
      });
      update('conditions', imported);
    };

    const updateCondition = (index: number, field: string, value: string) => {
      const updated = [...conditions];
      updated[index] = { ...updated[index], [field]: value };
      update('conditions', updated);
    };

    const removeCondition = (index: number) => {
      update('conditions', conditions.filter((_, i) => i !== index));
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">Conditions</label>
          <button onClick={addCondition} className="text-xs text-whatsapp-teal flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {/* Import from template button */}
        <button
          onClick={importFromTemplate}
          disabled={!upstreamButtons}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            upstreamButtons
              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer'
              : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
        >
          <Download className="w-3 h-3" />
          {upstreamButtons ? 'Import buttons from template' : 'No upstream template found'}
        </button>

        {conditions.map((cond, i) => (
          <div key={cond.id || i} className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
            <div className="flex items-center justify-between">
              <Input
                value={cond.label}
                onChange={(e) => updateCondition(i, 'label', e.target.value)}
                placeholder="Label"
                className="!text-xs"
              />
              <button onClick={() => removeCondition(i)} className="p-1 text-red-400 hover:text-red-600 ml-2">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <select
              value={cond.matchType}
              onChange={(e) => updateCondition(i, 'matchType', e.target.value)}
              className="w-full h-8 px-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal"
            >
              {matchTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {cond.matchType !== 'DEFAULT' && (
              <Input
                value={cond.value || ''}
                onChange={(e) => updateCondition(i, 'value', e.target.value)}
                placeholder="Match value"
                className="!text-xs"
              />
            )}
          </div>
        ))}
        {conditions.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No conditions. Add at least one.</p>
        )}
      </div>
    );
  };

  const nodeTypeLabels: Record<string, string> = {
    START: 'Start Node',
    SEND_MESSAGE: 'Send Message',
    WAIT_FOR_REPLY: 'Wait for Reply',
    CONDITION: 'Condition',
    END: 'End Node',
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {nodeTypeLabels[node.type || ''] || 'Properties'}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDeleteNode}
            className="p-1 rounded-md hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {node.type === 'START' && renderStartProps()}
        {node.type === 'SEND_MESSAGE' && renderMessageProps()}
        {node.type === 'WAIT_FOR_REPLY' && renderWaitProps()}
        {node.type === 'CONDITION' && renderConditionProps()}
        {node.type === 'END' && (
          <p className="text-sm text-gray-500">This node ends the flow. No configuration needed.</p>
        )}
      </div>
    </div>
  );
};

export default NodePropertiesPanel;
