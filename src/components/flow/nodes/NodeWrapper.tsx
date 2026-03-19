import { useState, type ReactNode } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

interface NodeWrapperProps {
  id: string;
  children: ReactNode;
}

const NodeWrapper = ({ id, children }: NodeWrapperProps) => {
  const [hovered, setHovered] = useState(false);
  const { deleteElements } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this node? Connected edges will also be removed.')) {
      deleteElements({ nodes: [{ id }] });
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      {children}
    </div>
  );
};

export default NodeWrapper;
