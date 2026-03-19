import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface WaitNodeProps {
  id: string;
  data: { label?: string; timeoutSeconds?: number };
  selected?: boolean;
}

const WaitNode = ({ id, data, selected }: WaitNodeProps) => {
  const timeout = data.timeoutSeconds;
  const label = timeout
    ? timeout >= 3600
      ? `${Math.round(timeout / 3600)}h timeout`
      : `${Math.round(timeout / 60)}m timeout`
    : 'No timeout';

  return (
    <NodeWrapper id={id}>
      <div className={`px-4 py-3 rounded-xl border-2 bg-amber-50 min-w-[180px] shadow-sm transition-shadow ${
        selected ? 'border-amber-500 shadow-md' : 'border-amber-300'
      }`}>
        <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Wait for Reply</div>
            <div className="text-[11px] text-amber-600">{label}</div>
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
      </div>
    </NodeWrapper>
  );
};

export default WaitNode;
