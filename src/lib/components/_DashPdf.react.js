import React, {useState, useRef, useCallback, useEffect} from 'react';
import PropTypes, {func} from 'prop-types';
import {Document, Page} from 'react-pdf';
import {pdfjs} from 'react-pdf';

import 'react-pdf/dist/esm/Page/TextLayer.css';
import './_DashPdf.react.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DEFAULT_OPACITY = 0.3;
const MIN_DRAG_DISTANCE = 10;

/**
 * _DashPdf is a component that renders a PDF with annotation capabilities.
 * It takes a property, `data`, which is the PDF file to be rendered.
 * It allows navigation through the pages of the PDF and adding annotations.
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

    const currentAnnotations = annotations;

    function updateAnnotations(newAnnotations) {
        if (setProps) {
            setProps({annotations: newAnnotations});
        }
    }

    function setPageNumber(newPageNumber) {
        if (setProps) {
            setProps({pageNumber: newPageNumber});
        }
    }

    function onDocumentLoadSuccess({numPages}) {
        if (setProps) {
            setProps({numPages});
        }
        setPageNumber(1);
    }

    // Handle text selection for highlighting
    const handleTextSelection = useCallback(() => {
        if (!enableAnnotations || selectedAnnotationTool !== 'highlight') {
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

        // Get the container bounds for relative positioning
        const containerRect = containerRef.current.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect();

        // Calculate relative position within the PDF container
        const x = rangeRect.left - containerRect.left;
        const y = rangeRect.top - containerRect.top;
        const width = rangeRect.width;
        const height = rangeRect.height;

        // Only create highlight if there's a meaningful selection
        if (width > 5 && height > 5 && selectedText.length > 0) {
            const highlightAnnotation = {
                id: `highlight_${Date.now()}`,
                type: 'highlight',
                x,
                y,
                width,
                height,
                page: pageNumber,
                text: selectedText,
                color: '#ffff00',
                opacity: 0.3,
                timestamp: new Date().toISOString(),
            };

            const newAnnotations = [...currentAnnotations, highlightAnnotation];
            updateAnnotations(newAnnotations);

            if (onAnnotationAdd) {
                onAnnotationAdd(highlightAnnotation);
            }

            // Clear the selection after creating the annotation
            selection.removeAllRanges();
        }
    }, [
        enableAnnotations,
        selectedAnnotationTool,
        pageNumber,
        currentAnnotations,
        updateAnnotations,
        onAnnotationAdd,
    ]);

    // Listen for text selection changes
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                setIsTextSelecting(true);
            } else {
                setIsTextSelecting(false);
            }
        };

        const handleMouseUp = () => {
            // Small delay to ensure selection is complete before processing
            setTimeout(() => {
                if (selectedAnnotationTool === 'highlight') {
                    handleTextSelection();
                }
                setIsTextSelecting(false);
            }, 50);
        };

        if (enableAnnotations && selectedAnnotationTool === 'highlight') {
            document.addEventListener('selectionchange', handleSelectionChange);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener(
                    'selectionchange',
                    handleSelectionChange
                );
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [enableAnnotations, selectedAnnotationTool, handleTextSelection]);

    const handleMouseDown = useCallback(
        (e) => {
            if (!enableAnnotations) {
                return;
            }

            // Don't interfere with text selection for highlighting
            if (selectedAnnotationTool === 'highlight') {
                return;
            }

            if (selectedAnnotationTool === 'comment') {
                return;
            }

            // Check if user is clicking on an existing annotation
            if (
                e.target.closest(
                    '.annotation-comment, .annotation-rectangle, .annotation-text'
                )
            ) {
                return;
            }

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setIsDrawing(true);
            const newAnnotation = {
                id: `annotation_${Date.now()}`,
                type: selectedAnnotationTool,
                x,
                y,
                width: 0,
                height: 0,
                page: pageNumber,
                text: selectedAnnotationTool === 'text' ? 'Edit this text' : '',
                comment: '',
                timestamp: new Date().toISOString(),
            };
            setCurrentAnnotation(newAnnotation);
        },
        [enableAnnotations, selectedAnnotationTool, pageNumber]
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (!isDrawing || !currentAnnotation) {
                return;
            }

            // Don't interfere with text selection
            if (selectedAnnotationTool === 'highlight' || isTextSelecting) {
                return;
            }

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setCurrentAnnotation((prev) => ({
                ...prev,
                width: x - prev.x,
                height: y - prev.y,
            }));
        },
        [isDrawing, currentAnnotation, selectedAnnotationTool, isTextSelecting]
    );

    const handleMouseUp = useCallback(() => {
        // Don't interfere with text selection for highlighting
        if (selectedAnnotationTool === 'highlight' || isTextSelecting) {
            return;
        }

        if (isDrawing && currentAnnotation) {
            // Check if the user actually dragged (not just clicked)
            const draggedDistance = Math.sqrt(
                Math.pow(currentAnnotation.width, 2) +
                    Math.pow(currentAnnotation.height, 2)
            );

            // Only create annotation if user dragged enough distance
            if (draggedDistance >= MIN_DRAG_DISTANCE) {
                const newAnnotations = [
                    ...currentAnnotations,
                    currentAnnotation,
                ];
                updateAnnotations(newAnnotations);

                // Call callback if provided
                if (onAnnotationAdd) {
                    onAnnotationAdd(currentAnnotation);
                }
            }

            setCurrentAnnotation(null);
        }
        setIsDrawing(false);
    }, [
        isDrawing,
        currentAnnotation,
        currentAnnotations,
        updateAnnotations,
        onAnnotationAdd,
        selectedAnnotationTool,
        isTextSelecting,
    ]);

    const addCommentAnnotation = useCallback(
        (e) => {
            if (!enableAnnotations || selectedAnnotationTool !== 'comment') {
                return;
            }

            // Don't add comment if clicking on existing annotations
            if (
                e.target.closest(
                    '.annotation-comment, .annotation-rectangle, .annotation-text, .annotation-highlight'
                )
            ) {
                return;
            }

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const newAnnotation = {
                id: `comment_${Date.now()}`,
                type: 'comment',
                x,
                y,
                width: 20,
                height: 20,
                page: pageNumber,
                comment: 'New comment',
                timestamp: new Date().toISOString(),
            };

            const newAnnotations = [...currentAnnotations, newAnnotation];
            updateAnnotations(newAnnotations);

            if (onAnnotationAdd) {
                onAnnotationAdd(newAnnotation);
            }
        },
        [
            enableAnnotations,
            selectedAnnotationTool,
            pageNumber,
            currentAnnotations,
            updateAnnotations,
            onAnnotationAdd,
        ]
    );

    const deleteAnnotation = useCallback(
        (annotationId) => {
            const newAnnotations = currentAnnotations.filter(
                (ann) => ann.id !== annotationId
            );
            updateAnnotations(newAnnotations);

            if (onAnnotationDelete) {
                onAnnotationDelete(annotationId);
            }
        },
        [currentAnnotations, updateAnnotations, onAnnotationDelete]
    );

    const updateAnnotationText = useCallback(
        (annotationId, newText) => {
            const newAnnotations = currentAnnotations.map((ann) =>
                ann.id === annotationId ? {...ann, text: newText} : ann
            );
            updateAnnotations(newAnnotations);

            if (onAnnotationUpdate) {
                onAnnotationUpdate(annotationId, {text: newText});
            }
        },
        [currentAnnotations, updateAnnotations, onAnnotationUpdate]
    );

    const updateAnnotationComment = useCallback(
        (annotationId, newComment) => {
            const newAnnotations = currentAnnotations.map((ann) =>
                ann.id === annotationId ? {...ann, comment: newComment} : ann
            );
            updateAnnotations(newAnnotations);

            if (onAnnotationUpdate) {
                onAnnotationUpdate(annotationId, {comment: newComment});
            }
        },
        [currentAnnotations, updateAnnotations, onAnnotationUpdate]
    );

    const updateAnnotationColor = useCallback(
        (annotationId, newColor) => {
            const newAnnotations = currentAnnotations.map((ann) =>
                ann.id === annotationId ? {...ann, color: newColor} : ann
            );
            updateAnnotations(newAnnotations);

            if (onAnnotationUpdate) {
                onAnnotationUpdate(annotationId, {color: newColor});
            }
        },
        [currentAnnotations, updateAnnotations, onAnnotationUpdate]
    );

    const currentPageAnnotations = currentAnnotations.filter(
        (ann) => ann.page === pageNumber
    );

    // Determine mouse event handlers based on selected tool
    const getMouseHandlers = () => {
        if (selectedAnnotationTool === 'highlight') {
            // For highlight mode, don't attach mouse handlers that interfere with text selection
            return {
                onClick: undefined,
                onMouseDown: undefined,
                onMouseMove: undefined,
                onMouseUp: undefined,
            };
        } else if (selectedAnnotationTool === 'comment') {
            return {
                onClick: addCommentAnnotation,
                onMouseDown: undefined,
                onMouseMove: undefined,
                onMouseUp: undefined,
            };
        } else {
            // For rectangle and text tools
            return {
                onClick: undefined,
                onMouseDown: handleMouseDown,
                onMouseMove: handleMouseMove,
                onMouseUp: handleMouseUp,
            };
        }
    };

    const mouseHandlers = getMouseHandlers();

    const pdfContent = (
        <div
            ref={containerRef}
            className={`pdf-container ${
                selectedAnnotationTool === 'highlight' ? 'highlight-mode' : ''
            }`}
            style={{
                position: 'relative',
                display: 'inline-block',
                userSelect:
                    selectedAnnotationTool === 'highlight' ? 'text' : 'none',
            }}
            {...mouseHandlers}
        >
            <Document file={data} onLoadSuccess={onDocumentLoadSuccess}>
                <Page
                    ref={pageRef}
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                />
            </Document>

            {/* Render Annotations */}
            {enableAnnotations &&
                currentPageAnnotations.map((annotation) => (
                    <div key={annotation.id}>
                        {annotation.type === 'comment' && (
                            <div
                                className="annotation-comment"
                                style={{
                                    position: 'absolute',
                                    left: annotation.x - 12,
                                    top: annotation.y - 12,
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: '#fbbf24',
                                    border: '2px solid #f59e0b',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    zIndex: 10,
                                }}
                                title={annotation.comment}
                            >
                                💬
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAnnotation(annotation.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {annotation.type === 'rectangle' && (
                            <div
                                className="annotation-rectangle"
                                style={{
                                    position: 'absolute',
                                    left: Math.min(
                                        annotation.x,
                                        annotation.x + annotation.width
                                    ),
                                    top: Math.min(
                                        annotation.y,
                                        annotation.y + annotation.height
                                    ),
                                    width: Math.abs(annotation.width),
                                    height: Math.abs(annotation.height),
                                    border: '2px solid #dc2626',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    zIndex: 5,
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAnnotation(annotation.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {annotation.type === 'text' && (
                            <div
                                className="annotation-text"
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
                                        updateAnnotationText(
                                            annotation.id,
                                            e.target.value
                                        )
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        backgroundColor: '#dbeafe',
                                        border: '1px solid #3b82f6',
                                        padding: '4px 8px',
                                        fontSize: '14px',
                                        borderRadius: '4px',
                                        minWidth: '80px',
                                    }}
                                />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAnnotation(annotation.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {annotation.type === 'highlight' && (
                            <>
                                {/* Highlight area - no pointer events */}
                                <div
                                    className="annotation-highlight"
                                    style={{
                                        position: 'absolute',
                                        left: annotation.x,
                                        top: annotation.y,
                                        width: annotation.width,
                                        height: annotation.height,
                                        backgroundColor:
                                            annotation.color || '#ffff00',
                                        opacity:
                                            annotation.opacity ||
                                            DEFAULT_OPACITY,
                                        pointerEvents: 'none',
                                        borderRadius: '2px',
                                        zIndex: 1,
                                    }}
                                    title={
                                        annotation.text
                                            ? `"${annotation.text}"`
                                            : 'Highlighted text'
                                    }
                                />
                                {/* Delete button - separate element with pointer events */}
                                <button
                                    className="annotation-highlight-delete"
                                    onClick={(e) => {
                                        console.log('delete highlight');
                                        e.stopPropagation();
                                        deleteAnnotation(annotation.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left:
                                            annotation.x + annotation.width - 8,
                                        top: annotation.y - 8,
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        pointerEvents: 'auto', // Explicitly enable pointer events
                                    }}
                                >
                                    ×
                                </button>
                            </>
                        )}
                    </div>
                ))}

            {/* Current drawing annotation */}
            {enableAnnotations &&
                currentAnnotation &&
                selectedAnnotationTool !== 'highlight' && (
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
                            border: '2px dashed #6b7280',
                            backgroundColor: 'rgba(156, 163, 175, 0.1)',
                            pointerEvents: 'none',
                            zIndex: 5,
                            opacity: (() => {
                                const dragDistance = Math.sqrt(
                                    Math.pow(currentAnnotation.width, 2) +
                                        Math.pow(currentAnnotation.height, 2)
                                );
                                return dragDistance >= MIN_DRAG_DISTANCE
                                    ? 1
                                    : 0.5;
                            })(),
                            borderColor: (() => {
                                const dragDistance = Math.sqrt(
                                    Math.pow(currentAnnotation.width, 2) +
                                        Math.pow(currentAnnotation.height, 2)
                                );
                                return dragDistance >= MIN_DRAG_DISTANCE
                                    ? '#6b7280'
                                    : '#ef4444';
                            })(),
                        }}
                    />
                )}
        </div>
    );

    return (
        <div id={id} className="dash-pdf-container">
            <div style={{display: 'flex'}}>
                <div style={{flex: 1}}>{pdfContent}</div>
            </div>
        </div>
    );
};

_DashPdf.defaultProps = {
    enableAnnotations: false,
    annotations: [],
    selectedAnnotationTool: 'comment',
    scale: 1.0,
    pageNumber: 1,
};

_DashPdf.propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks.
     */
    id: PropTypes.string,

    /**
     * The PDF data to be rendered.
     */
    data: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(ArrayBuffer),
        PropTypes.instanceOf(Uint8Array),
    ]).isRequired,

    /**
     * Dash-assigned callback that should be called to report property changes
     * to Dash, to make them available for callbacks.
     */
    setProps: PropTypes.func,

    /**
     * Scale factor for PDF rendering.
     */
    scale: PropTypes.number,

    /**
     * Current page number.
     */
    pageNumber: PropTypes.number,

    /**
     * Total number of pages (read-only).
     */
    numPages: PropTypes.number,

    /**
     * Enable annotation functionality.
     */
    enableAnnotations: PropTypes.bool,

    /**
     * Array of annotation objects. Each annotation should have:
     * - id: unique identifier
     * - type: 'comment', 'rectangle', 'text', or 'highlight'
     * - x, y: position coordinates
     * - width, height: dimensions (for rectangles and highlights)
     * - page: page number
     * - text: text content (for text annotations and selected text for highlights)
     * - comment: comment content (for comments)
     * - color: highlight color (for highlights, hex format)
     * - opacity: highlight opacity (for highlights, 0-1)
     */
    annotations: PropTypes.arrayOf(PropTypes.object),

    /**
     * Currently selected annotation tool ('comment', 'rectangle', 'text', 'highlight').
     */
    selectedAnnotationTool: PropTypes.oneOf([
        'comment',
        'rectangle',
        'text',
        'highlight',
    ]),

    /**
     * Callback fired when an annotation is added.
     */
    onAnnotationAdd: PropTypes.func,

    /**
     * Callback fired when an annotation is deleted.
     */
    onAnnotationDelete: PropTypes.func,

    /**
     * Callback fired when an annotation is updated.
     */
    onAnnotationUpdate: PropTypes.func,
};

export default _DashPdf;
