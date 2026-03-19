import { Handle, Position } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import NodeWrapper from './NodeWrapper';

interface MessageNodeProps {
  id: string;
  data: { label?: string; messageType?: string; text?: { body: string }; template?: { templateName?: string } };
  selected?: boolean;
}

const MessageNode = ({ id, data, selected }: MessageNodeProps) => {
  const preview = data.messageType === 'TEMPLATE'
    ? data.template?.templateName || 'Template'
    : data.text?.body
      ? data.text.body.length > 50 ? data.text.body.slice(0, 50) + '...' : data.text.body
      : data.messageType || 'Message';

  return (
    <NodeWrapper id={id}>
      <div className={`px-4 py-3 rounded-xl border-2 bg-blue-50 min-w-[180px] max-w-[260px] shadow-sm transition-shadow ${
        selected ? 'border-blue-500 shadow-md' : 'border-blue-300'
      }`}>
        <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              {data.messageType === 'TEMPLATE' ? 'Template' : 'Send Message'}
            </div>
            <div className="text-[11px] text-blue-600 truncate">{preview}</div>
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white" />
      </div>
    </NodeWrapper>
  );
};

export default MessageNode;
