/**
 * Scenario Definitions
 * Define your animation scenarios using simple configuration
 */

// Example: Kubernetes Control Plane Flow
export const kubernetesControlPlane = {
    id: 'k8s-control-plane',
    name: 'Kubernetes Control Plane',
    description: 'How kubectl commands flow through the Kubernetes control plane to create resources',
    category: 'Kubernetes',

    // Define zones (background areas)
    zones: [
        { id: 'control-plane-zone', x: 50, y: 50, width: 500, height: 300, label: 'CONTROL PLANE', color: '#6366f1' },
        { id: 'worker-zone', x: 600, y: 50, width: 550, height: 600, label: 'WORKER NODES', color: '#10b981' }
    ],

    // Define components
    components: [
        // Control Plane
        { id: 'user', type: 'user', x: 100, y: 450, label: 'kubectl' },
        { id: 'api-server', type: 'rectangle', x: 150, y: 150, width: 120, height: 50, color: '#6366f1', label: 'API Server' },
        { id: 'etcd', type: 'cylinder', x: 350, y: 100, width: 80, height: 100, color: '#ef4444', label: 'etcd' },
        { id: 'scheduler', type: 'hexagon', x: 200, y: 280, size: 35, color: '#f59e0b', label: 'Scheduler' },
        { id: 'controller', type: 'gear', x: 350, y: 280, size: 30, color: '#8b5cf6', label: 'Controller' },

        // Worker Nodes
        { id: 'node1', type: 'server', x: 700, y: 150, label: 'Node 1' },
        { id: 'node2', type: 'server', x: 900, y: 150, label: 'Node 2' },
        { id: 'pod1', type: 'hexagon', x: 700, y: 350, size: 25, color: '#326CE5', label: 'Pod' },
        { id: 'pod2', type: 'hexagon', x: 800, y: 350, size: 25, color: '#326CE5', label: 'Pod' },
        { id: 'pod3', type: 'hexagon', x: 900, y: 350, size: 25, color: '#326CE5', label: 'Pod' }
    ],

    // Define connections
    connections: [
        { id: 'conn-user-api', type: 'arrow', from: { x: 100, y: 400 }, to: { x: 170, y: 200 }, color: '#6366f1' },
        { id: 'conn-api-etcd', type: 'arrow', from: { x: 270, y: 175 }, to: { x: 350, y: 175 }, color: '#ef4444' },
        { id: 'conn-api-scheduler', type: 'arrow', from: { x: 210, y: 200 }, to: { x: 200, y: 250 }, color: '#f59e0b' },
        { id: 'conn-api-controller', type: 'arrow', from: { x: 270, y: 175 }, to: { x: 330, y: 260 }, color: '#8b5cf6' },
        { id: 'conn-scheduler-node', type: 'orthogonal', from: { x: 235, y: 280 }, to: { x: 670, y: 150 }, color: '#10b981', dashed: true },
        { id: 'conn-node-pod1', type: 'arrow', from: { x: 700, y: 200 }, to: { x: 700, y: 320 }, color: '#326CE5' },
        { id: 'conn-node-pod2', type: 'arrow', from: { x: 800, y: 200 }, to: { x: 800, y: 320 }, color: '#326CE5' }
    ],

    // Animation steps
    steps: [
        {
            title: 'User sends kubectl command',
            description: 'User runs kubectl apply to create a Deployment',
            actions: [
                { type: 'fadeIn', target: 'user', duration: 0.5 },
                { type: 'fadeIn', target: 'control-plane-zone', duration: 0.3 },
                { type: 'fadeIn', target: 'api-server', duration: 0.5, delay: 0.3 }
            ]
        },
        {
            title: 'API Server receives request',
            description: 'API Server authenticates and validates the request',
            actions: [
                { type: 'fadeIn', target: 'conn-user-api', duration: 0.3 },
                { type: 'drawLine', target: 'conn-user-api', duration: 0.8 },
                { type: 'pulse', target: 'api-server', duration: 0.5 },
                { type: 'highlight', target: 'api-server', color: '#6366f1' }
            ]
        },
        {
            title: 'State persisted to etcd',
            description: 'API Server writes the desired state to etcd',
            actions: [
                { type: 'fadeIn', target: 'etcd', duration: 0.4 },
                { type: 'fadeIn', target: 'conn-api-etcd', duration: 0.3 },
                { type: 'drawLine', target: 'conn-api-etcd', duration: 0.6 },
                { type: 'pulse', target: 'etcd', duration: 0.5 },
                { type: 'unhighlight', target: 'api-server' }
            ]
        },
        {
            title: 'Scheduler watches for unassigned Pods',
            description: 'Scheduler detects new Pod needs to be scheduled',
            actions: [
                { type: 'fadeIn', target: 'scheduler', duration: 0.4 },
                { type: 'fadeIn', target: 'conn-api-scheduler', duration: 0.3 },
                { type: 'highlight', target: 'scheduler', color: '#f59e0b' }
            ]
        },
        {
            title: 'Controller Manager reconciles',
            description: 'Deployment controller creates ReplicaSet, which creates Pods',
            actions: [
                { type: 'fadeIn', target: 'controller', duration: 0.4 },
                { type: 'fadeIn', target: 'conn-api-controller', duration: 0.3 },
                { type: 'pulse', target: 'controller', duration: 0.6 },
                { type: 'unhighlight', target: 'scheduler' }
            ]
        },
        {
            title: 'Worker Nodes appear',
            description: 'Scheduler assigns Pods to available Nodes',
            actions: [
                { type: 'fadeIn', target: 'worker-zone', duration: 0.3 },
                { type: 'fadeIn', target: 'node1', duration: 0.4 },
                { type: 'fadeIn', target: 'node2', duration: 0.4, delay: 0.2 },
                { type: 'fadeIn', target: 'conn-scheduler-node', duration: 0.3 },
                { type: 'drawLine', target: 'conn-scheduler-node', duration: 1 }
            ]
        },
        {
            title: 'Pods are created',
            description: 'Kubelet on each Node creates the containers',
            actions: [
                { type: 'fadeIn', target: 'conn-node-pod1', duration: 0.3 },
                { type: 'fadeIn', target: 'pod1', duration: 0.5 },
                { type: 'fadeIn', target: 'conn-node-pod2', duration: 0.3, delay: 0.2 },
                { type: 'fadeIn', target: 'pod2', duration: 0.5, delay: 0.2 },
                { type: 'fadeIn', target: 'pod3', duration: 0.5, delay: 0.4 },
                { type: 'highlight', target: 'pod1', color: '#10b981' },
                { type: 'highlight', target: 'pod2', color: '#10b981' },
                { type: 'highlight', target: 'pod3', color: '#10b981' }
            ]
        },
        {
            title: 'Deployment Complete!',
            description: 'All Pods are running and the Deployment is successful',
            actions: [
                { type: 'color', target: 'pod1', color: '#10b981' },
                { type: 'color', target: 'pod2', color: '#10b981' },
                { type: 'color', target: 'pod3', color: '#10b981' }
            ]
        }
    ]
};

// Example: Data Flow / API Request
export const apiRequestFlow = {
    id: 'api-request',
    name: 'API Request Flow',
    description: 'How a user request flows through a typical web application',
    category: 'Architecture',

    zones: [
        { id: 'frontend-zone', x: 50, y: 50, width: 250, height: 200, label: 'FRONTEND', color: '#3b82f6' },
        { id: 'backend-zone', x: 350, y: 50, width: 400, height: 500, label: 'BACKEND', color: '#8b5cf6' },
        { id: 'data-zone', x: 800, y: 50, width: 300, height: 500, label: 'DATA LAYER', color: '#ef4444' }
    ],

    components: [
        { id: 'user', type: 'user', x: 150, y: 400, label: 'User' },
        { id: 'browser', type: 'rectangle', x: 80, y: 130, width: 140, height: 50, color: '#3b82f6', label: 'Browser' },
        { id: 'load-balancer', type: 'diamond', x: 450, y: 130, size: 45, color: '#f59e0b', label: 'LB' },
        { id: 'api-server1', type: 'server', x: 420, y: 300, label: 'API Server 1' },
        { id: 'api-server2', type: 'server', x: 550, y: 300, label: 'API Server 2' },
        { id: 'cache', type: 'hexagon', x: 680, y: 300, size: 35, color: '#10b981', label: 'Cache' },
        { id: 'database', type: 'database', x: 900, y: 200, color: '#8b5cf6', label: 'PostgreSQL' },
        { id: 'queue', type: 'rectangle', x: 850, y: 380, width: 100, height: 40, color: '#f59e0b', label: 'Queue' }
    ],

    connections: [
        { id: 'conn-user-browser', type: 'arrow', from: { x: 150, y: 360 }, to: { x: 150, y: 180 }, color: '#3b82f6' },
        { id: 'conn-browser-lb', type: 'arrow', from: { x: 220, y: 155 }, to: { x: 405, y: 130 }, color: '#f59e0b' },
        { id: 'conn-lb-api1', type: 'arrow', from: { x: 450, y: 175 }, to: { x: 420, y: 250 }, color: '#8b5cf6' },
        { id: 'conn-lb-api2', type: 'arrow', from: { x: 495, y: 130 }, to: { x: 550, y: 250 }, color: '#8b5cf6', dashed: true },
        { id: 'conn-api1-cache', type: 'arrow', from: { x: 450, y: 300 }, to: { x: 645, y: 300 }, color: '#10b981' },
        { id: 'conn-cache-db', type: 'arrow', from: { x: 715, y: 300 }, to: { x: 870, y: 220 }, color: '#8b5cf6' },
        { id: 'conn-api1-queue', type: 'arrow', from: { x: 450, y: 340 }, to: { x: 850, y: 400 }, color: '#f59e0b', dashed: true }
    ],

    steps: [
        {
            title: 'User interacts with the application',
            description: 'User clicks a button or submits a form in the browser',
            actions: [
                { type: 'fadeIn', target: 'frontend-zone' },
                { type: 'fadeIn', target: 'user' },
                { type: 'fadeIn', target: 'browser', delay: 0.3 },
                { type: 'fadeIn', target: 'conn-user-browser' },
                { type: 'drawLine', target: 'conn-user-browser', duration: 0.5 }
            ]
        },
        {
            title: 'Request hits Load Balancer',
            description: 'Browser sends HTTP request to the load balancer',
            actions: [
                { type: 'fadeIn', target: 'backend-zone' },
                { type: 'fadeIn', target: 'load-balancer' },
                { type: 'fadeIn', target: 'conn-browser-lb' },
                { type: 'drawLine', target: 'conn-browser-lb', duration: 0.6 },
                { type: 'pulse', target: 'load-balancer' }
            ]
        },
        {
            title: 'Load Balancer routes to API Server',
            description: 'Request is distributed to an available API server',
            actions: [
                { type: 'fadeIn', target: 'api-server1' },
                { type: 'fadeIn', target: 'api-server2' },
                { type: 'fadeIn', target: 'conn-lb-api1' },
                { type: 'fadeIn', target: 'conn-lb-api2' },
                { type: 'drawLine', target: 'conn-lb-api1', duration: 0.5 },
                { type: 'highlight', target: 'api-server1', color: '#8b5cf6' }
            ]
        },
        {
            title: 'Check Cache first',
            description: 'API Server checks Redis cache for existing data',
            actions: [
                { type: 'fadeIn', target: 'data-zone' },
                { type: 'fadeIn', target: 'cache' },
                { type: 'fadeIn', target: 'conn-api1-cache' },
                { type: 'drawLine', target: 'conn-api1-cache', duration: 0.6 },
                { type: 'pulse', target: 'cache' }
            ]
        },
        {
            title: 'Query Database',
            description: 'Cache miss - query the primary database',
            actions: [
                { type: 'fadeIn', target: 'database' },
                { type: 'fadeIn', target: 'conn-cache-db' },
                { type: 'drawLine', target: 'conn-cache-db', duration: 0.6 },
                { type: 'highlight', target: 'database', color: '#8b5cf6' }
            ]
        },
        {
            title: 'Async job queued',
            description: 'Background job added to message queue for processing',
            actions: [
                { type: 'fadeIn', target: 'queue' },
                { type: 'fadeIn', target: 'conn-api1-queue' },
                { type: 'drawLine', target: 'conn-api1-queue', duration: 0.8 },
                { type: 'unhighlight', target: 'api-server1' },
                { type: 'unhighlight', target: 'database' }
            ]
        }
    ]
};

// Example: Simple Flow Template (for users to customize)
export const simpleFlowTemplate = {
    id: 'simple-flow',
    name: 'Simple Flow Template',
    description: 'A basic template showing how to create custom flows',
    category: 'Templates',

    zones: [],

    components: [
        { id: 'start', type: 'circle', x: 150, y: 350, radius: 30, color: '#10b981', label: 'Start' },
        { id: 'step1', type: 'rectangle', x: 280, y: 320, width: 120, height: 60, color: '#6366f1', label: 'Step 1' },
        { id: 'decision', type: 'diamond', x: 500, y: 350, size: 50, color: '#f59e0b', label: '?' },
        { id: 'step2a', type: 'rectangle', x: 620, y: 220, width: 120, height: 60, color: '#8b5cf6', label: 'Option A' },
        { id: 'step2b', type: 'rectangle', x: 620, y: 420, width: 120, height: 60, color: '#3b82f6', label: 'Option B' },
        { id: 'end', type: 'circle', x: 850, y: 350, radius: 30, color: '#ef4444', label: 'End' }
    ],

    connections: [
        { id: 'conn-start-step1', type: 'arrow', from: { x: 180, y: 350 }, to: { x: 280, y: 350 }, color: '#10b981' },
        { id: 'conn-step1-decision', type: 'arrow', from: { x: 400, y: 350 }, to: { x: 450, y: 350 }, color: '#6366f1' },
        { id: 'conn-decision-a', type: 'curve', from: { x: 550, y: 350 }, to: { x: 620, y: 250 }, color: '#8b5cf6', curvature: 30 },
        { id: 'conn-decision-b', type: 'curve', from: { x: 550, y: 350 }, to: { x: 620, y: 450 }, color: '#3b82f6', curvature: -30 },
        { id: 'conn-a-end', type: 'curve', from: { x: 740, y: 250 }, to: { x: 820, y: 350 }, color: '#8b5cf6', curvature: 30 },
        { id: 'conn-b-end', type: 'curve', from: { x: 740, y: 450 }, to: { x: 820, y: 350 }, color: '#3b82f6', curvature: -30 }
    ],

    steps: [
        {
            title: 'Process starts',
            description: 'The flow begins from the start node',
            actions: [
                { type: 'fadeIn', target: 'start' },
                { type: 'highlight', target: 'start', color: '#10b981' }
            ]
        },
        {
            title: 'First step',
            description: 'Process moves to step 1',
            actions: [
                { type: 'fadeIn', target: 'conn-start-step1' },
                { type: 'drawLine', target: 'conn-start-step1', duration: 0.5 },
                { type: 'fadeIn', target: 'step1' },
                { type: 'unhighlight', target: 'start' },
                { type: 'highlight', target: 'step1', color: '#6366f1' }
            ]
        },
        {
            title: 'Decision point',
            description: 'A decision needs to be made',
            actions: [
                { type: 'fadeIn', target: 'conn-step1-decision' },
                { type: 'drawLine', target: 'conn-step1-decision', duration: 0.5 },
                { type: 'fadeIn', target: 'decision' },
                { type: 'unhighlight', target: 'step1' },
                { type: 'pulse', target: 'decision' }
            ]
        },
        {
            title: 'Branching paths',
            description: 'Different options lead to different outcomes',
            actions: [
                { type: 'fadeIn', target: 'step2a' },
                { type: 'fadeIn', target: 'step2b' },
                { type: 'fadeIn', target: 'conn-decision-a' },
                { type: 'fadeIn', target: 'conn-decision-b' },
                { type: 'drawLine', target: 'conn-decision-a', duration: 0.6 },
                { type: 'drawLine', target: 'conn-decision-b', duration: 0.6 }
            ]
        },
        {
            title: 'Process ends',
            description: 'All paths lead to the end',
            actions: [
                { type: 'fadeIn', target: 'conn-a-end' },
                { type: 'fadeIn', target: 'conn-b-end' },
                { type: 'fadeIn', target: 'end' },
                { type: 'highlight', target: 'end', color: '#ef4444' }
            ]
        }
    ]
};

// Export all scenarios
export const scenarios = [
    kubernetesControlPlane,
    apiRequestFlow,
    simpleFlowTemplate
];

// YAML-based scenarios (loaded dynamically)
export const yamlScenarios = [
    { path: 'scenarios/examples/advanced-animations.yaml', name: 'Kubernetes Advanced Animations', category: 'Kubernetes' },
    { path: 'scenarios/examples/feature-test.yaml', name: 'Feature Test', category: 'Demos' }
];

export default scenarios;
