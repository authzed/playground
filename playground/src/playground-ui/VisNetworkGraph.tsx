import { CircularProgress } from '@material-ui/core';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import clsx from 'clsx';
import { dequal } from 'dequal';
import { useRef, useState } from 'react';
import 'react-reflex/styles.css';
import useDeepCompareEffect from 'use-deep-compare-effect';
import vis from 'visjs-network';
import { useDebouncedChecker } from './debouncer';

export type EdgeShape = 'ellipse' |
    'circle' |
    'database' |
    'box' |
    'text' |
    'image' |
    'circularImage' |
    'diamond' |
    'dot' |
    'star' |
    'triangle' |
    'triangleDown' |
    'square' |
    'icon' |
    'hexagon';

export interface VisNode {
    id: number | string
    label: string
    title?: string
    group?: string
    shapeProperties?: {
        borderDashes?: boolean | number[]
    }
    color?: string | {
        border?: string
        background?: string
        highlight?: string
    }

    shape?: EdgeShape
}

export interface VisEdge {
    id: string
    from: number | string
    to: number | string
    title?: string | Element
    color?: {
        color?: string
        highlight?: string
    },
    arrows?: { to?: { enabled?: boolean } }
    dashes?: boolean | number[]
}

interface VisGraphDefinition<N extends VisNode, E extends VisEdge> {
    nodes: N[], edges: E[]
}

/**
 * simplify the graph for comparison. We only include fields that affect the shape of
 * the graph.
 */
function simplify<N extends VisNode, E extends VisEdge>(graph: VisGraphDefinition<N, E>) {
    return {
        nodes: graph.nodes.map((node: N) => {
            return {
                id: node.id,
            }
        }),
        edges: graph.edges.map((edge: E) => {
            return {
                id: edge.id,
                from: edge.from,
                to: edge.to,
            }
        }),
    }
}

function applyChangesInPlace<N extends VisNode, E extends VisEdge>(visNodeSet: any, visEdgeSet: any, existingGraph: VisGraphDefinition<N, E>, graph: VisGraphDefinition<N, E>) {
    // Check if the only changes are to the metadata of the nodes and edges. If so, they can
    // be applied without recreating the entire network.
    if (existingGraph.edges.length !== graph.edges.length ||
        existingGraph.nodes.length !== graph.nodes.length) {
        return false;
    }

    // Clone the graphs in simplified form for comparison.
    const existingSimplified = simplify(existingGraph);
    const simplified = simplify(graph);
    if (!dequal(existingSimplified, simplified)) {
        return false;
    }


    // If we've reach this point, then the graphs are the same with exception of allowable in-place
    // changes.
    // Apply any color and label changes.
    graph.nodes.forEach((node: N) => {
        visNodeSet.update({ id: node.id, color: node.color, label: node.label, title: node.title });
    });
    graph.edges.forEach((edge: E) => {
        if (edge.color) {
            visEdgeSet.update({ id: edge.id, color: edge.color });
        }

        visEdgeSet.update({ id: edge.id, title: edge.title });
    });
    return true;
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        graph: {
            width: '100%', height: '100%',
            '& code': {
                fontSize: '85%'
            }
        },
    }));

export interface VisNetworkGraphSelection<N extends VisNode, E extends VisEdge> { nodes: N[], edges: E[] }

export interface VisNetworkGraphProps<N extends VisNode, E extends VisEdge> {
    graph: VisGraphDefinition<N, E>
    selected?: VisNetworkGraphSelection<N, E>
    onDblClicked?: (nodes: N[], edges: E[]) => void
    className?: string
}


/**
 * Renders a VISJS network graph.
 *
 * NOTE: The following tags must be included in index.html for this component to be used:  
 *  &lt;script src="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.js"></script>
 *  &lt;link href="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.css" rel="stylesheet" type="text/css" />
 */
export default function VisNetworkGraph<N extends VisNode = VisNode, E extends VisEdge = VisEdge>(props: VisNetworkGraphProps<N, E>) {
    const theme = useTheme();
    const classes = useStyles();

    const divRef = useRef(null);
    const networkRef = useRef<any>();
    const currentGraphRef = useRef<VisGraphDefinition<N, E> | undefined>();
    const nodeDataSetRef = useRef<any>();
    const edgeDataSetRef = useRef<any>();
    const [isLoaded, setIsLoaded] = useState(false);

    const updateSelection = (selection: VisNetworkGraphSelection<N, E> | undefined) => {
        if (!selection) {
            return;
        }

        const network = networkRef.current;
        if (network !== undefined && nodeDataSetRef.current && edgeDataSetRef.current) {
            network.setSelection({
                nodes: selection.nodes.map((node: N) => node.id).filter((nodeID: string | number) => !!nodeDataSetRef.current.get(nodeID)),
                edges: selection.edges.map((edge: E) => edge.id).filter((edgeID: string) => !!edgeDataSetRef.current.get(edgeID))
            }, {
                highlightEdges: false
            });
        }
    };

    const { run: runUpdate, isActive: isActive } = useDebouncedChecker(250, async (graph: VisGraphDefinition<N, E>) => {
        // Check for in-place changes.
        if (networkRef.current && applyChangesInPlace(nodeDataSetRef.current, edgeDataSetRef.current, currentGraphRef.current!, graph)) {
            updateSelection(props.selected);
            return;
        }

        if (divRef.current === null) {
            return;
        }

        nodeDataSetRef.current = new vis.DataSet(graph.nodes);
        edgeDataSetRef.current = new vis.DataSet(graph.edges);

        // Otherwise, create an entirely new network.
        currentGraphRef.current = graph;
        const network = new vis.Network(divRef.current, { nodes: nodeDataSetRef.current, edges: edgeDataSetRef.current }, {
            nodes: {
                shape: 'dot',
                size: 10,
                font: {
                    size: 12,
                    color: theme.palette.text.primary,
                },
                borderWidth: 2,
                shadow: true
            },
            edges: {
                width: 2,
                shadow: true
            },
            layout: {
                randomSeed: 42,
                improvedLayout: true
            }
        });
        network.on("stabilizationIterationsDone", function () {
            network.setOptions({ physics: false });
        });

        if (props.onDblClicked !== undefined) {
            network.on("doubleClick", function (e: { nodes: string[], edges: string[] }) {
                const nodes = props.graph.nodes.filter((node: VisNode) => e.nodes.includes(node.id.toString()));
                const edges = props.graph.edges.filter((edge: VisEdge) => e.edges.includes(edge.id.toString()));
                if (props.onDblClicked !== undefined) {
                    props.onDblClicked(nodes, edges);
                }
            });
        }

        networkRef.current = network;

        updateSelection(props.selected);
        setIsLoaded(true);
    });

    useDeepCompareEffect(() => {
        if (divRef.current) {
            runUpdate(props.graph);
        }
    }, [props.graph, divRef]);

    useDeepCompareEffect(() => {
        if (isActive()) {
            return;
        }

        updateSelection(props.selected);
    }, [props.selected, networkRef, updateSelection, isActive])

    return <div className={clsx(classes.graph, props.className)}>
        {!isLoaded && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></div>}
        <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </div>;
}
