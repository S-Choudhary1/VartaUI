import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import { ArrowLeft, Save, Play, Pause, Zap, MessageSquare, Clock, GitBranch, CircleStop, CheckCircle, GripVertical, Settings2, ChevronDown, ChevronRight } from 'lucide-react';
import FlowCanvas from '../components/flow/FlowCanvas';
import NodePropertiesPanel from '../components/flow/NodePropertiesPanel';
import FlowAnalyticsView from '../components/flow/FlowAnalytics';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getFlow, createFlow, updateFlow, activateFlow, pauseFlow } from '../services/flowService';
import type { FlowDefinition, FlowNodeType, FlowStatus, FlowCondition } from '../types';

const CONDITION_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#22c55e', '#ef4444', '#f59e0b'];

const paletteItems: { type: FlowNodeType; label: string; description: string; icon: any; color: string; iconBg: string }[] = [
  { type: 'START', label: 'Start', description: 'Entry point', icon: Zap, color: 'border-emerald-200 hover:border-emerald-300', iconBg: 'bg-emerald-50 text-emerald-600' },
  { type: 'SEND_MESSAGE', label: 'Message', description: 'Send a message', icon: MessageSquare, color: 'border-blue-200 hover:border-blue-300', iconBg: 'bg-blue-50 text-blue-600' },
  { type: 'WAIT_FOR_REPLY', label: 'Wait', description: 'Wait for reply', icon: Clock, color: 'border-amber-200 hover:border-amber-300', iconBg: 'bg-amber-50 text-amber-600' },
  { type: 'CONDITION', label: 'Condition', description: 'Branch logic', icon: GitBranch, color: 'border-violet-200 hover:border-violet-300', iconBg: 'bg-violet-50 text-violet-600' },
  { type: 'END', label: 'End', description: 'End the flow', icon: CircleStop, color: 'border-red-200 hover:border-red-300', iconBg: 'bg-red-50 text-red-600' },
];

const defaultNodeData: Record<FlowNodeType, Record<string, any>> = {
  START: { triggerType: 'KEYWORD', keywords: [] },
  SEND_MESSAGE: { messageType: 'TEXT', text: { body: '' } },
  WAIT_FOR_REPLY: { timeoutSeconds: 86400 },
  CONDITION: { conditions: [{ id: 'default', matchType: 'DEFAULT', label: 'Fallback' }] },
  END: {},
};

const FlowBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [flowName, setFlowName] = useState('Untitled Flow');
  const [flowDescription, setFlowDescription] = useState('');
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('DRAFT');
  const [flowId, setFlowId] = useState<string | null>(id === 'new' ? null : id || null);
  const [triggerType, setTriggerType] = useState('KEYWORD');
  const [triggerKeywords, setTriggerKeywords] = useState('');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Build edge styling from label/style data
  const buildEdgeProps = (label?: string, style?: { stroke?: string; strokeWidth?: number }) => {
    if (!label) return { animated: true, style: style || { stroke: '#94a3b8', strokeWidth: 2 } };
    return {
      animated: true,
      style: style || { stroke: '#94a3b8', strokeWidth: 2 },
      label,
      labelStyle: { fill: style?.stroke || '#94a3b8', fontWeight: 600, fontSize: 11 },
      labelShowBg: true,
      labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    };
  };

  // Load existing flow
  useEffect(() => {
    if (!isNew && id) {
      getFlow(id).then((flow) => {
        setFlowName(flow.name);
        setFlowDescription(flow.description || '');
        setFlowStatus(flow.status);
        setFlowId(flow.id);
        setTriggerType(flow.triggerType || 'KEYWORD');
        setTriggerKeywords(flow.triggerKeywords || '');

        if (flow.definitionJson) {
          try {
            const def: FlowDefinition = JSON.parse(flow.definitionJson);
            setNodes(def.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })));
            setEdges(def.edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              ...buildEdgeProps(e.label, e.style ? { stroke: e.style.stroke, strokeWidth: e.style.strokeWidth || 2 } : undefined),
            })));
          } catch (e) {
            console.error('Failed to parse flow definition', e);
          }
        }
      }).catch(() => setError('Failed to load flow.'));
    }
  }, [id, isNew]);

  const onConnect = useCallback((params: Connection) => {
    const sourceNode = nodes.find(n => n.id === params.source);
    let edgeStyle = { stroke: '#94a3b8', strokeWidth: 2 };
    let edgeLabel: string | undefined;

    if (sourceNode?.type === 'CONDITION' && params.sourceHandle) {
      const conditions: FlowCondition[] = (sourceNode.data as any)?.conditions || [];
      const condIndex = conditions.findIndex(c => c.id === params.sourceHandle);
      if (condIndex >= 0) {
        edgeLabel = conditions[condIndex].label || conditions[condIndex].matchType;
        edgeStyle = { stroke: CONDITION_COLORS[condIndex % CONDITION_COLORS.length], strokeWidth: 2 };
      }
    }

    setEdges((eds) =>
      addEdge({ ...params, ...buildEdgeProps(edgeLabel, edgeStyle) }, eds)
    );
  }, [setEdges, nodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowAnalytics(false);
  }, []);

  const onPaneClick = useCallback(() => { setSelectedNode(null); }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as FlowNodeType;
    if (!type) return;

    // Enforce single START node
    if (type === 'START' && nodes.some(n => n.type === 'START')) {
      setError('Only one START node is allowed per flow.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const position = {
      x: event.clientX - reactFlowBounds.left - 90,
      y: event.clientY - reactFlowBounds.top - 20,
    };

    const newNode: Node = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      type,
      position,
      data: { ...defaultNodeData[type] },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, nodes]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(prev => prev?.id === nodeId ? null : prev);
  }, [setNodes, setEdges]);

  const handleNodeUpdate = useCallback((nodeId: string, data: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...data } } : n))
    );
    setSelectedNode((prev) => prev && prev.id === nodeId ? { ...prev, data: { ...data } } : prev);

    // Sync edge labels when condition node conditions change
    if (data.conditions) {
      setEdges((eds) => {
        const conditionIds = new Set((data.conditions as FlowCondition[]).map(c => c.id));
        return eds
          .filter(e => {
            // Remove orphaned edges from this condition node
            if (e.source === nodeId && e.sourceHandle && !conditionIds.has(e.sourceHandle)) return false;
            return true;
          })
          .map((e) => {
            if (e.source !== nodeId || !e.sourceHandle) return e;
            const cond = (data.conditions as FlowCondition[]).find(c => c.id === e.sourceHandle);
            if (!cond) return e;
            const condIndex = (data.conditions as FlowCondition[]).indexOf(cond);
            const color = CONDITION_COLORS[condIndex % CONDITION_COLORS.length];
            return {
              ...e,
              ...buildEdgeProps(cond.label || cond.matchType, { stroke: color, strokeWidth: 2 }),
            };
          });
      });
    }
  }, [setNodes, setEdges]);

  // Edge validation
  const isValidConnection = useCallback((connection: Connection) => {
    if (connection.source === connection.target) return false;
    const existing = edges.find(
      e => e.source === connection.source &&
           e.sourceHandle === (connection.sourceHandle || null) &&
           e.target === connection.target
    );
    return !existing;
  }, [edges]);

  // Flow validation
  const validateFlow = (): string[] => {
    const errors: string[] = [];
    const startNodes = nodes.filter(n => n.type === 'START');
    if (startNodes.length === 0) errors.push('Flow must have a START node');
    if (startNodes.length > 1) errors.push('Flow can only have one START node');

    for (const node of nodes) {
      const hasIncoming = edges.some(e => e.target === node.id);
      const hasOutgoing = edges.some(e => e.source === node.id);
      if (node.type !== 'START' && !hasIncoming) {
        errors.push(`"${node.type}" node has no incoming connection`);
      }
      if (node.type !== 'END' && !hasOutgoing) {
        errors.push(`"${node.type}" node has no outgoing connection`);
      }
    }

    for (const node of nodes.filter(n => n.type === 'CONDITION')) {
      const conds: FlowCondition[] = (node.data as any)?.conditions || [];
      if (!conds.some(c => c.matchType === 'DEFAULT')) {
        errors.push('Condition node needs a DEFAULT (fallback) branch');
      }
    }

    for (const node of nodes.filter(n => n.type === 'SEND_MESSAGE')) {
      const d = node.data as any;
      if (d.messageType === 'TEMPLATE' && !d.template?.templateId) {
        errors.push('Message node has no template selected');
      }
    }

    return errors;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    const definition: FlowDefinition = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type as FlowNodeType,
        data: n.data as any,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        label: typeof e.label === 'string' ? e.label : undefined,
        style: e.style ? { stroke: (e.style as any).stroke, strokeWidth: (e.style as any).strokeWidth } : undefined,
      })),
    };

    const request = {
      name: flowName,
      description: flowDescription,
      triggerType,
      triggerKeywords,
      definitionJson: JSON.stringify(definition),
    };

    try {
      if (flowId) {
        await updateFlow(flowId, request);
      } else {
        const created = await createFlow(request);
        setFlowId(created.id);
        navigate(`/flows/${created.id}`, { replace: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save flow.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!flowId) return;
    try {
      if (flowStatus === 'ACTIVE') {
        await pauseFlow(flowId);
        setFlowStatus('PAUSED');
      } else {
        const validationErrors = validateFlow();
        if (validationErrors.length > 0) {
          setError(`Cannot activate: ${validationErrors.join('; ')}`);
          return;
        }
        await handleSave();
        await activateFlow(flowId);
        setFlowStatus('ACTIVE');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const statusBadgeVariant = flowStatus === 'ACTIVE' ? 'success' : flowStatus === 'PAUSED' ? 'warning' : 'default';

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50" ref={reactFlowWrapper}>
      {/* Top Toolbar */}
      <div className="h-14 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/flows')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="text-base font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-48 md:w-64 placeholder:text-gray-400"
            placeholder="Flow name..."
          />
          <Badge variant={statusBadgeVariant} dot>{flowStatus}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 max-w-xs truncate">
              {error}
            </span>
          )}
          {saveSuccess && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}
          {flowId && (
            <Button variant="outline" size="sm" onClick={() => { setShowAnalytics(!showAnalytics); setSelectedNode(null); }}>
              Analytics
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {flowId && (
            <Button
              size="sm"
              onClick={handleToggleStatus}
              className={flowStatus === 'ACTIVE' ? '!bg-amber-500 hover:!bg-amber-600' : ''}
            >
              {flowStatus === 'ACTIVE' ? (
                <><Pause className="w-4 h-4" /> Pause</>
              ) : (
                <><Play className="w-4 h-4" /> Activate</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Node Palette */}
        <div className="w-60 bg-white border-r border-gray-200/80 flex-shrink-0 overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Nodes Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Drag to canvas</h3>
              <div className="space-y-2">
                {paletteItems.map(({ type, label, description, icon: Icon, color, iconBg }) => (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md active:shadow-sm group ${color}`}
                  >
                    <div className={`p-1.5 rounded-lg ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{description}</p>
                    </div>
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>

            {/* Settings Section */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-600 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Settings
                </span>
                {settingsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {settingsOpen && (
                <Card className="!shadow-none border-gray-100">
                  <CardContent className="p-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Trigger</label>
                      <select
                        value={triggerType}
                        onChange={(e) => setTriggerType(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]/40 transition-all"
                      >
                        <option value="KEYWORD">Keyword</option>
                        <option value="CAMPAIGN">Campaign</option>
                        <option value="MANUAL">Manual</option>
                      </select>
                    </div>
                    {triggerType === 'KEYWORD' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Keywords</label>
                        <input
                          type="text"
                          value={triggerKeywords}
                          onChange={(e) => setTriggerKeywords(e.target.value)}
                          placeholder="hi, hello"
                          className="w-full h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]/40 transition-all placeholder:text-gray-400"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                      <textarea
                        value={flowDescription}
                        onChange={(e) => setFlowDescription(e.target.value)}
                        placeholder="Flow description..."
                        className="w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]/40 min-h-[60px] resize-y transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        {showAnalytics && flowId ? (
          <div className="flex-1 overflow-y-auto p-6">
            <FlowAnalyticsView flowId={flowId} />
          </div>
        ) : (
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            isValidConnection={isValidConnection}
          />
        )}

        {/* Right Panel - Properties */}
        {selectedNode && !showAnalytics && (
          <NodePropertiesPanel
            node={selectedNode}
            nodes={nodes}
            edges={edges}
            onUpdate={handleNodeUpdate}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};

export default FlowBuilder;
