import React, {useState, useRef, useCallback, useEffect} from 'react';
import PropTypes from 'prop-types';
import {Document, Page} from 'react-pdf';
import {pdfjs} from 'react-pdf';

import 'react-pdf/dist/esm/Page/TextLayer.css';
import './_DashPdf.react.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DEFAULT_OPACITY = 0.3;
const MIN_DRAG_DISTANCE = 10;

// Annotation rendering configurations
const ANNOTATION_STYLES = {
    comment: {
        size: 24,
        backgroundColor: '#fbbf24',
        border: '2px solid #f59e0b',
        icon: '💬',
    },
    rectangle: {
        border: '2px solid #dc2626',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    text: {
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
        if (!enableAnnotations || selectedAnnotationTool !== 'highlight')
            return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect();

        const x = rangeRect.left - containerRect.left;
        const y = rangeRect.top - containerRect.top;
        const {width, height} = rangeRect;

        if (width > 5 && height > 5) {
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
        enableAnnotations,
        selectedAnnotationTool,
        createAnnotation,
        addAnnotation,
    ]);

    // Selection change listeners
    useEffect(() => {
        if (!enableAnnotations || selectedAnnotationTool !== 'highlight')
            return;

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
            }, 50);
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
    }, [enableAnnotations, selectedAnnotationTool, handleTextSelection]);

    // Drawing handlers for rectangle and text tools
    const handleMouseDown = useCallback(
        (e) => {
            if (
                !enableAnnotations ||
                selectedAnnotationTool === 'highlight' ||
                selectedAnnotationTool === 'comment' ||
                e.target.closest(
                    '.annotation-comment, .annotation-rectangle, .annotation-text'
                )
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
                text: selectedAnnotationTool === 'text' ? 'Edit this text' : '',
                comment: '',
            });

            setCurrentAnnotation(newAnnotation);
        },
        [
            enableAnnotations,
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
        if (selectedAnnotationTool === 'highlight' || isTextSelecting) return;

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

    // Comment annotation handler
    const addCommentAnnotation = useCallback(
        (e) => {
            if (
                !enableAnnotations ||
                selectedAnnotationTool !== 'comment' ||
                e.target.closest(
                    '.annotation-comment, .annotation-rectangle, .annotation-text, .annotation-highlight'
                )
            ) {
                return;
            }

            const {x, y} = getRelativePosition(e);
            const commentAnnotation = createAnnotation({
                type: 'comment',
                x,
                y,
                width: 20,
                height: 20,
                comment: 'New comment',
            });

            addAnnotation(commentAnnotation);
        },
        [
            enableAnnotations,
            selectedAnnotationTool,
            getRelativePosition,
            createAnnotation,
            addAnnotation,
        ]
    );

    // Get appropriate mouse handlers based on selected tool
    const getMouseHandlers = useCallback(() => {
        switch (selectedAnnotationTool) {
            case 'highlight':
                return {};
            case 'comment':
                return {onClick: addCommentAnnotation};
            default:
                return {
                    onMouseDown: handleMouseDown,
                    onMouseMove: handleMouseMove,
                    onMouseUp: handleMouseUp,
                };
        }
    }, [
        selectedAnnotationTool,
        addCommentAnnotation,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    ]);

    // Render delete button component
    const DeleteButton = useCallback(
        ({annotationId, style = {}}) => (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    deleteAnnotation(annotationId);
                }}
                style={{...DELETE_BUTTON_STYLE, ...style}}
            >
                ×
            </button>
        ),
        [deleteAnnotation]
    );

    // Render individual annotation components
    const renderAnnotation = useCallback(
        (annotation) => {
            const commonProps = {
                key: annotation.id,
                className: `annotation-${annotation.type}`,
                style: {
                    position: 'absolute',
                    zIndex: annotation.type === 'highlight' ? 1 : 5,
                },
            };

            switch (annotation.type) {
                case 'comment':
                    return (
                        <div
                            {...commonProps}
                            style={{
                                ...commonProps.style,
                                left: annotation.x - 12,
                                top: annotation.y - 12,
                                width: `${ANNOTATION_STYLES.comment.size}px`,
                                height: `${ANNOTATION_STYLES.comment.size}px`,
                                backgroundColor:
                                    ANNOTATION_STYLES.comment.backgroundColor,
                                border: ANNOTATION_STYLES.comment.border,
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
                            {ANNOTATION_STYLES.comment.icon}
                            <DeleteButton annotationId={annotation.id} />
                        </div>
                    );

                case 'rectangle':
                    return (
                        <div
                            {...commonProps}
                            style={{
                                ...commonProps.style,
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
                                border: ANNOTATION_STYLES.rectangle.border,
                                backgroundColor:
                                    ANNOTATION_STYLES.rectangle.backgroundColor,
                            }}
                        >
                            <DeleteButton annotationId={annotation.id} />
                        </div>
                    );

                case 'text':
                    return (
                        <div
                            {...commonProps}
                            style={{
                                ...commonProps.style,
                                left: annotation.x,
                                top: annotation.y,
                                zIndex: 10,
                            }}
                        >
                            <input
                                type="text"
                                value={annotation.text}
                                onChange={(e) =>
                                    updateAnnotation(annotation.id, {
                                        text: e.target.value,
                                    })
                                }
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    backgroundColor:
                                        ANNOTATION_STYLES.text.backgroundColor,
                                    border: ANNOTATION_STYLES.text.border,
                                    padding: '4px 8px',
                                    fontSize: '14px',
                                    borderRadius: '4px',
                                    minWidth: '80px',
                                }}
                            />
                            <DeleteButton annotationId={annotation.id} />
                        </div>
                    );

                case 'highlight':
                    return (
                        <div key={annotation.id}>
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
                                        ANNOTATION_STYLES.highlight
                                            .defaultColor,
                                    opacity:
                                        annotation.opacity || DEFAULT_OPACITY,
                                    pointerEvents: 'none',
                                    borderRadius:
                                        ANNOTATION_STYLES.highlight
                                            .borderRadius,
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
                                style={{
                                    left: annotation.x + annotation.width - 8,
                                    top: annotation.y - 8,
                                    zIndex: 10,
                                    pointerEvents: 'auto',
                                }}
                            />
                        </div>
                    );

                default:
                    return null;
            }
        },
        [updateAnnotation, DeleteButton]
    );

    // Filter annotations for current page
    const currentPageAnnotations = annotations.filter(
        (ann) => ann.page === pageNumber
    );
    const mouseHandlers = getMouseHandlers();

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
                            currentPageAnnotations.map(renderAnnotation)}

                        {/* Current drawing annotation preview */}
                        {enableAnnotations &&
                            currentAnnotation &&
                            selectedAnnotationTool !== 'highlight' && (
                                <div
                                    className="annotation-drawing"
                                    style={{
                                        position: 'absolute',
                                        left: Math.min(
                                            currentAnnotation.x,
                                            currentAnnotation.x +
                                                currentAnnotation.width
                                        ),
                                        top: Math.min(
                                            currentAnnotation.y,
                                            currentAnnotation.y +
                                                currentAnnotation.height
                                        ),
                                        width: Math.abs(
                                            currentAnnotation.width
                                        ),
                                        height: Math.abs(
                                            currentAnnotation.height
                                        ),
                                        border: '2px dashed #6b7280',
                                        backgroundColor:
                                            'rgba(156, 163, 175, 0.1)',
                                        pointerEvents: 'none',
                                        zIndex: 5,
                                        opacity: (() => {
                                            const dragDistance = Math.sqrt(
                                                Math.pow(
                                                    currentAnnotation.width,
                                                    2
                                                ) +
                                                    Math.pow(
                                                        currentAnnotation.height,
                                                        2
                                                    )
                                            );
                                            return dragDistance >=
                                                MIN_DRAG_DISTANCE
                                                ? 1
                                                : 0.5;
                                        })(),
                                        borderColor: (() => {
                                            const dragDistance = Math.sqrt(
                                                Math.pow(
                                                    currentAnnotation.width,
                                                    2
                                                ) +
                                                    Math.pow(
                                                        currentAnnotation.height,
                                                        2
                                                    )
                                            );
                                            return dragDistance >=
                                                MIN_DRAG_DISTANCE
                                                ? '#6b7280'
                                                : '#ef4444';
                                        })(),
                                    }}
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
    selectedAnnotationTool: 'comment',
    scale: 1.0,
    pageNumber: 1,
};

_DashPdf.propTypes = {
    id: PropTypes.string,
    data: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(ArrayBuffer),
        PropTypes.instanceOf(Uint8Array),
    ]).isRequired,
    setProps: PropTypes.func,
    scale: PropTypes.number,
    pageNumber: PropTypes.number,
    numPages: PropTypes.number,
    enableAnnotations: PropTypes.bool,
    annotations: PropTypes.arrayOf(PropTypes.object),
    selectedAnnotationTool: PropTypes.oneOf([
        'comment',
        'rectangle',
        'text',
        'highlight',
    ]),
    onAnnotationAdd: PropTypes.func,
    onAnnotationDelete: PropTypes.func,
    onAnnotationUpdate: PropTypes.func,
};

export default _DashPdf;
