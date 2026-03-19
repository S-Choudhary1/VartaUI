import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface StartNodeProps {
  id: string;
  data: { label?: string; triggerType?: string; keywords?: string[] };
  selected?: boolean;
}

const StartNode = ({ id, data, selected }: StartNodeProps) => (
  <NodeWrapper id={id}>
    <div className={`px-4 py-3 rounded-xl border-2 bg-green-50 min-w-[180px] shadow-sm transition-shadow ${
      selected ? 'border-green-500 shadow-md' : 'border-green-300'
    }`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Start</div>
          <div className="text-[11px] text-green-600">
            {data.triggerType === 'KEYWORD' && data.keywords?.length
              ? data.keywords.join(', ')
              : data.triggerType || 'Trigger'}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  </NodeWrapper>
);

export default StartNode;
