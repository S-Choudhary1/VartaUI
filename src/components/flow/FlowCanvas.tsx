import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StartNode from './nodes/StartNode';
import MessageNode from './nodes/MessageNode';
import WaitNode from './nodes/WaitNode';
import ConditionNode from './nodes/ConditionNode';
import EndNode from './nodes/EndNode';

const nodeTypes: NodeTypes = {
  START: StartNode,
  SEND_MESSAGE: MessageNode,
  WAIT_FOR_REPLY: WaitNode,
  CONDITION: ConditionNode,
  END: EndNode,
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  onConnect: OnConnect;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  isValidConnection?: (connection: Connection) => boolean;
}

const FlowCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDrop,
  onDragOver,
  isValidConnection,
}: FlowCanvasProps) => {
  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-gray-50"
      >
        <Background gap={20} size={1} color="#e5e7eb" />
        <Controls className="!bg-white !border-gray-200 !shadow-sm" />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'START': return '#22c55e';
              case 'SEND_MESSAGE': return '#3b82f6';
              case 'WAIT_FOR_REPLY': return '#f59e0b';
              case 'CONDITION': return '#a855f7';
              case 'END': return '#ef4444';
              default: return '#6b7280';
            }
          }}
          className="!bg-white !border-gray-200"
        />
      </ReactFlow>
    </div>
  );
};

export default FlowCanvas;
