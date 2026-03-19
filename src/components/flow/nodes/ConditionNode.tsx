import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import NodeWrapper from './NodeWrapper';
import type { FlowCondition } from '../../../types';

interface ConditionNodeProps {
  id: string;
  data: { label?: string; conditions?: FlowCondition[] };
  selected?: boolean;
}

const HANDLE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#22c55e', '#ef4444', '#f59e0b'];

const ConditionNode = ({ id, data, selected }: ConditionNodeProps) => {
  const conditions = data.conditions || [];

  return (
    <NodeWrapper id={id}>
      <div className={`px-4 py-3 rounded-xl border-2 bg-purple-50 min-w-[200px] shadow-sm transition-shadow ${
        selected ? 'border-purple-500 shadow-md' : 'border-purple-300'
      }`}>
        <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Condition</div>
        </div>
        {conditions.length > 0 && (
          <div className="space-y-1 mb-2">
            {conditions.map((cond, i) => (
              <div key={cond.id || i} className="text-[11px] text-purple-600 bg-purple-100/50 rounded px-2 py-0.5 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: HANDLE_COLORS[i % HANDLE_COLORS.length] }}
                />
                {cond.label || cond.matchType}
              </div>
            ))}
          </div>
        )}
        {/* Output handles with labels */}
        {conditions.length > 0 && (
          <div className="flex justify-around mt-1 pt-1 border-t border-purple-200/50">
            {conditions.map((cond, i) => (
              <div key={cond.id || i} className="flex flex-col items-center gap-0.5 relative">
                <span className="text-[8px] font-medium whitespace-nowrap" style={{ color: HANDLE_COLORS[i % HANDLE_COLORS.length] }}>
                  {cond.label || cond.matchType}
                </span>
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={cond.id}
                  className="!w-2.5 !h-2.5 !border-2 !border-white"
                  style={{
                    backgroundColor: HANDLE_COLORS[i % HANDLE_COLORS.length],
                    position: 'relative',
                    transform: 'none',
                    left: 'auto',
                    top: 'auto',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </NodeWrapper>
  );
};

export default ConditionNode;
