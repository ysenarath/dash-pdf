import React, {useState, useRef, useCallback, useEffect} from 'react';
import PropTypes from 'prop-types';
import {pdfjs, Document, Page} from 'react-pdf';

import 'react-pdf/dist/esm/Page/TextLayer.css';
import './_DashPdf.react.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DEFAULT_OPACITY = 0.3;
const DISABLED_OPACITY = 0.7;
const MIN_DRAG_DISTANCE = 10;
const MIN_HIGHLIGHT_DISTANCE = 5;
const TEXT_SELECTION_DELAY = 50;
const DELETE_BUTTON_OFFSET_X = 8;
const DELETE_BUTTON_OFFSET_Y = 8;

// Annotation rendering configurations
const ANNOTATION_STYLES = {
    rectangle: {
        border: '2px solid #dc2626',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    comment: {
        backgroundColor: '#dbeafe',
        border: '1px solid #3b82f6',
    },
    highlight: {
        defaultColor: '#ffff00',
        borderRadius: '2px',
    },
};

const DELETE_BUTTON_STYLE = {
    position: 'absolute',
    width: '16px',
    height: '16px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    fontSize: '10px',
    cursor: 'pointer',
    top: '-8px',
    right: '-8px',
};

// Delete Button Component
const DeleteButton = ({
    annotationId,
    onDelete,
    selectedAnnotationTool,
    style = {},
}) => {
    if (selectedAnnotationTool === 'none') {
        return null;
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onDelete(annotationId);
            }}
            style={{...DELETE_BUTTON_STYLE, ...style}}
        >
            ×
        </button>
    );
};

DeleteButton.propTypes = {
    annotationId: PropTypes.string.isRequired,
    onDelete: PropTypes.func.isRequired,
    selectedAnnotationTool: PropTypes.string.isRequired,
    style: PropTypes.object,
};

// Rectangle Annotation Component
const RectangleAnnotation = ({
    annotation,
    onDelete,
    selectedAnnotationTool,
}) => {
    return (
        <div
            className="annotation-rectangle"
            style={{
                position: 'absolute',
                left: Math.min(annotation.x, annotation.x + annotation.width),
                top: Math.min(annotation.y, annotation.y + annotation.height),
                width: Math.abs(annotation.width),
                height: Math.abs(annotation.height),
                border: ANNOTATION_STYLES.rectangle.border,
                backgroundColor: ANNOTATION_STYLES.rectangle.backgroundColor,
                zIndex: 5,
            }}
        >
            <DeleteButton
                annotationId={annotation.id}
                onDelete={onDelete}
                selectedAnnotationTool={selectedAnnotationTool}
            />
        </div>
    );
};

RectangleAnnotation.propTypes = {
    annotation: PropTypes.object.isRequired,
    onDelete: PropTypes.func.isRequired,
    selectedAnnotationTool: PropTypes.string.isRequired,
};

// Comment Annotation Component
const CommentAnnotation = ({
    annotation,
    onDelete,
    onUpdate,
    selectedAnnotationTool,
}) => {
    return (
        <div
            className="annotation-comment"
            style={{
                position: 'absolute',
                left: annotation.x,
                top: annotation.y,
                zIndex: 10,
            }}
        >
            <input
                type="text"
                value={annotation.text}
                onChange={(e) =>
                    selectedAnnotationTool !== 'none' &&
                    onUpdate(annotation.id, {
                        text: e.target.value,
                    })
                }
                onClick={(e) => e.stopPropagation()}
                disabled={selectedAnnotationTool === 'none'}
                style={{
                    backgroundColor: ANNOTATION_STYLES.comment.backgroundColor,
                    border: ANNOTATION_STYLES.comment.border,
                    padding: '4px 8px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    minWidth: '80px',
                    cursor:
                        selectedAnnotationTool === 'none' ? 'default' : 'text',
                    opacity:
                        selectedAnnotationTool === 'none'
                            ? DISABLED_OPACITY
                            : 1,
                }}
            />
            <DeleteButton
                annotationId={annotation.id}
                onDelete={onDelete}
                selectedAnnotationTool={selectedAnnotationTool}
            />
        </div>
    );
};

CommentAnnotation.propTypes = {
    annotation: PropTypes.object.isRequired,
    onDelete: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    selectedAnnotationTool: PropTypes.string.isRequired,
};

// Highlight Annotation Component
const HighlightAnnotation = ({
    annotation,
    onDelete,
    selectedAnnotationTool,
}) => {
    return (
        <div>
            <div
                className="annotation-highlight"
                style={{
                    position: 'absolute',
                    left: annotation.x,
                    top: annotation.y,
                    width: annotation.width,
                    height: annotation.height,
                    backgroundColor:
                        annotation.color ||
                        ANNOTATION_STYLES.highlight.defaultColor,
                    opacity: annotation.opacity || DEFAULT_OPACITY,
                    pointerEvents: 'none',
                    borderRadius: ANNOTATION_STYLES.highlight.borderRadius,
                    zIndex: 1,
                }}
                title={
                    annotation.text
                        ? `"${annotation.text}"`
                        : 'Highlighted text'
                }
            />
            <DeleteButton
                annotationId={annotation.id}
                onDelete={onDelete}
                selectedAnnotationTool={selectedAnnotationTool}
                style={{
                    left:
                        annotation.x +
                        annotation.width -
                        DELETE_BUTTON_OFFSET_X,
                    top: annotation.y - DELETE_BUTTON_OFFSET_Y,
                    zIndex: 10,
                    pointerEvents: 'auto',
                }}
            />
        </div>
    );
};

HighlightAnnotation.propTypes = {
    annotation: PropTypes.object.isRequired,
    onDelete: PropTypes.func.isRequired,
    selectedAnnotationTool: PropTypes.string.isRequired,
};

// Drawing Preview Component
const DrawingPreview = ({currentAnnotation}) => {
    if (!currentAnnotation) {
        return null;
    }

    const dragDistance = Math.sqrt(
        Math.pow(currentAnnotation.width, 2) +
            Math.pow(currentAnnotation.height, 2)
    );

    const isValidDrag = dragDistance >= MIN_DRAG_DISTANCE;

    return (
        <div
            className="annotation-drawing"
            style={{
                position: 'absolute',
                left: Math.min(
                    currentAnnotation.x,
                    currentAnnotation.x + currentAnnotation.width
                ),
                top: Math.min(
                    currentAnnotation.y,
                    currentAnnotation.y + currentAnnotation.height
                ),
                width: Math.abs(currentAnnotation.width),
                height: Math.abs(currentAnnotation.height),
                border: '2px dashed',
                backgroundColor: 'rgba(156, 163, 175, 0.1)',
                pointerEvents: 'none',
                zIndex: 5,
                opacity: isValidDrag ? 1 : 0.5,
                borderColor: isValidDrag ? '#6b7280' : '#ef4444',
            }}
        />
    );
};

DrawingPreview.propTypes = {
    currentAnnotation: PropTypes.object,
};

// Annotation Factory Function
const createAnnotationComponent = (annotation, handlers) => {
    const {onDelete, onUpdate, selectedAnnotationTool} = handlers;

    const commonProps = {
        key: annotation.id,
        annotation,
        onDelete,
        selectedAnnotationTool,
    };

    switch (annotation.type) {
        case 'rectangle':
            return <RectangleAnnotation {...commonProps} />;
        case 'comment':
            return <CommentAnnotation {...commonProps} onUpdate={onUpdate} />;
        case 'highlight':
            return <HighlightAnnotation {...commonProps} />;
        default:
            return null;
    }
};

/**
 * _DashPdf is a component that renders a PDF with annotation capabilities.
 */
const _DashPdf = (props) => {
    const {
        id,
        data,
        setProps,
        enableAnnotations,
        annotations,
        selectedAnnotationTool,
        scale,
        onAnnotationAdd,
        onAnnotationDelete,
        onAnnotationUpdate,
        pageNumber,
    } = props;

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentAnnotation, setCurrentAnnotation] = useState(null);
    const [isTextSelecting, setIsTextSelecting] = useState(false);

    const containerRef = useRef(null);
    const pageRef = useRef(null);

    // Check if annotation tools are active (not 'none')
    const isAnnotationToolActive =
        enableAnnotations && selectedAnnotationTool !== 'none';

    // Utility functions
    const updateProps = useCallback(
        (updates) => {
            if (setProps) {
                setProps(updates);
            }
        },
        [setProps]
    );

    const updateAnnotations = useCallback(
        (newAnnotations) => {
            updateProps({annotations: newAnnotations});
        },
        [updateProps]
    );

    const createAnnotation = useCallback(
        (baseProps) => ({
            id: `${baseProps.type}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            page: pageNumber,
            ...baseProps,
        }),
        [pageNumber]
    );

    const getRelativePosition = useCallback((e) => {
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    const callCallback = useCallback((callback, ...args) => {
        if (callback && typeof callback === 'function') {
            callback(...args);
        }
    }, []);

    // Document load handler
    const onDocumentLoadSuccess = useCallback(
        ({numPages}) => {
            updateProps({numPages, pageNumber: 1});
        },
        [updateProps]
    );

    // Generic annotation operations
    const addAnnotation = useCallback(
        (annotation) => {
            const newAnnotations = [...annotations, annotation];
            updateAnnotations(newAnnotations);
            callCallback(onAnnotationAdd, annotation);
        },
        [annotations, updateAnnotations, onAnnotationAdd, callCallback]
    );

    const deleteAnnotation = useCallback(
        (annotationId) => {
            const newAnnotations = annotations.filter(
                (ann) => ann.id !== annotationId
            );
            updateAnnotations(newAnnotations);
            callCallback(onAnnotationDelete, annotationId);
        },
        [annotations, updateAnnotations, onAnnotationDelete, callCallback]
    );

    const updateAnnotation = useCallback(
        (annotationId, updates) => {
            const newAnnotations = annotations.map((ann) =>
                ann.id === annotationId ? {...ann, ...updates} : ann
            );
            updateAnnotations(newAnnotations);
            callCallback(onAnnotationUpdate, annotationId, updates);
        },
        [annotations, updateAnnotations, onAnnotationUpdate, callCallback]
    );

    // Text selection for highlighting
    const handleTextSelection = useCallback(() => {
        if (!isAnnotationToolActive || selectedAnnotationTool !== 'highlight') {
            return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        if (!selectedText) {
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect();

        const x = rangeRect.left - containerRect.left;
        const y = rangeRect.top - containerRect.top;
        const {width, height} = rangeRect;

        if (width > MIN_HIGHLIGHT_DISTANCE && height > MIN_HIGHLIGHT_DISTANCE) {
            const highlightAnnotation = createAnnotation({
                type: 'highlight',
                x,
                y,
                width,
                height,
                text: selectedText,
                color: ANNOTATION_STYLES.highlight.defaultColor,
                opacity: DEFAULT_OPACITY,
            });

            addAnnotation(highlightAnnotation);
            selection.removeAllRanges();
        }
    }, [
        isAnnotationToolActive,
        selectedAnnotationTool,
        createAnnotation,
        addAnnotation,
    ]);

    // Selection change listeners
    useEffect(() => {
        if (!isAnnotationToolActive || selectedAnnotationTool !== 'highlight') {
            return () => {};
        }

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            setIsTextSelecting(selection && selection.toString().length > 0);
        };

        const handleMouseUp = () => {
            setTimeout(() => {
                if (selectedAnnotationTool === 'highlight') {
                    handleTextSelection();
                }
                setIsTextSelecting(false);
            }, TEXT_SELECTION_DELAY);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener(
                'selectionchange',
                handleSelectionChange
            );
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isAnnotationToolActive, selectedAnnotationTool, handleTextSelection]);

    // Drawing handlers for rectangle and comment tools
    const handleMouseDown = useCallback(
        (e) => {
            if (
                !isAnnotationToolActive ||
                selectedAnnotationTool === 'highlight' ||
                selectedAnnotationTool === 'none' ||
                e.target.closest('.annotation-comment, .annotation-rectangle')
            ) {
                return;
            }

            const {x, y} = getRelativePosition(e);
            setIsDrawing(true);

            const newAnnotation = createAnnotation({
                type: selectedAnnotationTool,
                x,
                y,
                width: 0,
                height: 0,
                text:
                    selectedAnnotationTool === 'comment'
                        ? 'Edit this text'
                        : '',
            });

            setCurrentAnnotation(newAnnotation);
        },
        [
            isAnnotationToolActive,
            selectedAnnotationTool,
            getRelativePosition,
            createAnnotation,
        ]
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (
                !isDrawing ||
                !currentAnnotation ||
                selectedAnnotationTool === 'highlight' ||
                selectedAnnotationTool === 'none' ||
                isTextSelecting
            ) {
                return;
            }

            const {x, y} = getRelativePosition(e);
            setCurrentAnnotation((prev) => ({
                ...prev,
                width: x - prev.x,
                height: y - prev.y,
            }));
        },
        [
            isDrawing,
            currentAnnotation,
            selectedAnnotationTool,
            isTextSelecting,
            getRelativePosition,
        ]
    );

    const handleMouseUp = useCallback(() => {
        if (
            selectedAnnotationTool === 'highlight' ||
            selectedAnnotationTool === 'none' ||
            isTextSelecting
        ) {
            return;
        }

        if (isDrawing && currentAnnotation) {
            const draggedDistance = Math.sqrt(
                Math.pow(currentAnnotation.width, 2) +
                    Math.pow(currentAnnotation.height, 2)
            );

            if (draggedDistance >= MIN_DRAG_DISTANCE) {
                addAnnotation(currentAnnotation);
            }

            setCurrentAnnotation(null);
        }
        setIsDrawing(false);
    }, [
        isDrawing,
        currentAnnotation,
        selectedAnnotationTool,
        isTextSelecting,
        addAnnotation,
    ]);

    // Get appropriate mouse handlers based on selected tool
    const getMouseHandlers = useCallback(() => {
        if (!isAnnotationToolActive || selectedAnnotationTool === 'none') {
            return {};
        }

        switch (selectedAnnotationTool) {
            case 'highlight':
                return {};
            default:
                return {
                    onMouseDown: handleMouseDown,
                    onMouseMove: handleMouseMove,
                    onMouseUp: handleMouseUp,
                };
        }
    }, [
        isAnnotationToolActive,
        selectedAnnotationTool,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    ]);

    // Filter annotations for current page
    const currentPageAnnotations = annotations.filter(
        (ann) => ann.page === pageNumber
    );
    const mouseHandlers = getMouseHandlers();

    // Annotation handlers object
    const annotationHandlers = {
        onDelete: deleteAnnotation,
        onUpdate: updateAnnotation,
        selectedAnnotationTool,
    };

    return (
        <div id={id} className="dash-pdf-container">
            <div style={{display: 'flex'}}>
                <div style={{flex: 1}}>
                    <div
                        ref={containerRef}
                        className={`pdf-container ${
                            selectedAnnotationTool === 'highlight'
                                ? 'highlight-mode'
                                : ''
                        }`}
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            userSelect:
                                selectedAnnotationTool === 'highlight'
                                    ? 'text'
                                    : 'none',
                            cursor:
                                selectedAnnotationTool === 'none'
                                    ? 'default'
                                    : 'auto',
                        }}
                        {...mouseHandlers}
                    >
                        <Document
                            file={data}
                            onLoadSuccess={onDocumentLoadSuccess}
                        >
                            <Page
                                ref={pageRef}
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={true}
                                renderAnnotationLayer={false}
                            />
                        </Document>

                        {/* Render existing annotations */}
                        {enableAnnotations &&
                            currentPageAnnotations.map((annotation) =>
                                createAnnotationComponent(
                                    annotation,
                                    annotationHandlers
                                )
                            )}

                        {/* Current drawing annotation preview */}
                        {isAnnotationToolActive &&
                            currentAnnotation &&
                            selectedAnnotationTool !== 'highlight' &&
                            selectedAnnotationTool !== 'none' && (
                                <DrawingPreview
                                    currentAnnotation={currentAnnotation}
                                />
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
};

_DashPdf.defaultProps = {
    enableAnnotations: false,
    annotations: [],
    selectedAnnotationTool: 'none',
    scale: 1.0,
    pageNumber: 1,
};

_DashPdf.propTypes = {
    /** Unique identifier for the component */
    id: PropTypes.string,

    /** PDF data source - can be a URL string, ArrayBuffer, or Uint8Array */
    data: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(ArrayBuffer),
        PropTypes.instanceOf(Uint8Array),
    ]).isRequired,

    /** Callback function to update component props (used by Dash framework) */
    setProps: PropTypes.func,

    /** Zoom scale factor for the PDF display (default: 1.0) */
    scale: PropTypes.number,

    /** Current page number to display (1-based indexing) */
    pageNumber: PropTypes.number,

    /** Total number of pages in the PDF document */
    numPages: PropTypes.number,

    /** Whether annotation functionality is enabled */
    enableAnnotations: PropTypes.bool,

    /** Array of annotation objects containing position, type, and content data */
    annotations: PropTypes.arrayOf(PropTypes.object),

    /** Currently selected annotation tool type */
    selectedAnnotationTool: PropTypes.oneOf([
        'none',
        'comment',
        'rectangle',
        'highlight',
    ]),

    /** Callback fired when a new annotation is added */
    onAnnotationAdd: PropTypes.func,

    /** Callback fired when an annotation is deleted */
    onAnnotationDelete: PropTypes.func,

    /** Callback fired when an annotation is updated/modified */
    onAnnotationUpdate: PropTypes.func,
};

export default _DashPdf;
