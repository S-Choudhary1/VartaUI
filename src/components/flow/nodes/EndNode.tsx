import { Handle, Position } from '@xyflow/react';
import { CircleStop } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface EndNodeProps {
  id: string;
  data: { label?: string };
  selected?: boolean;
}

const EndNode = ({ id, data, selected }: EndNodeProps) => (
  <NodeWrapper id={id}>
    <div className={`px-4 py-3 rounded-xl border-2 bg-red-50 min-w-[140px] shadow-sm transition-shadow ${
      selected ? 'border-red-500 shadow-md' : 'border-red-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center">
          <CircleStop className="w-4 h-4 text-white" />
        </div>
        <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">End</div>
      </div>
    </div>
  </NodeWrapper>
);

export default EndNode;
