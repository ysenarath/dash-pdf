import React, {useState, useRef, useCallback, useEffect} from 'react';
import PropTypes from 'prop-types';
import {pdfjs, Document, Page} from 'react-pdf';

import 'react-pdf/dist/esm/Page/TextLayer.css';
import './_DashPdf.react.css';

// pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc =
    '/_dash-component-suites/dash_pdf_plus/pdf.worker.min.mjs';

const DEFAULT_OPACITY = 0.3;
const DISABLED_OPACITY = 0.7;
const MIN_DRAG_DISTANCE = 10;
const MIN_HIGHLIGHT_DISTANCE = 5;
const TEXT_SELECTION_DELAY = 50;
const DELETE_BUTTON_OFFSET_X = 8;
const DELETE_BUTTON_OFFSET_Y = 8;
const COMMENT_FONT_SIZE = 14;
const COMMENT_MIN_WIDTH = 80;
const MIN_RESIZE_SIZE = 20;

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
    onUpdate,
    selectedAnnotationTool,
    scale = 1.0,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [dragStart, setDragStart] = useState({x: 0, y: 0});
    const [initialPosition, setInitialPosition] = useState({x: 0, y: 0});
    const [initialSize, setInitialSize] = useState({width: 0, height: 0});

    // Text extraction utility for rectangles
    const extractTextFromRectangle = useCallback(
        (x, y, width, height) => {
            try {
                const container = document.querySelector('.pdf-container');
                const textLayer = container?.querySelector(
                    '.react-pdf__Page__textContent'
                );
                if (!textLayer) {
                    return '';
                }

                const textElements = textLayer.querySelectorAll('span');
                const extractedTexts = [];

                // Convert rectangle coordinates to absolute positions
                const rectLeft = Math.min(x, x + width) * scale;
                const rectTop = Math.min(y, y + height) * scale;
                const rectRight = Math.max(x, x + width) * scale;
                const rectBottom = Math.max(y, y + height) * scale;

                textElements.forEach((span) => {
                    const rect = span.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    // Convert to relative coordinates
                    const spanLeft = rect.left - containerRect.left;
                    const spanTop = rect.top - containerRect.top;
                    const spanRight = rect.right - containerRect.left;
                    const spanBottom = rect.bottom - containerRect.top;

                    // Check if text element overlaps with rectangle
                    const overlaps = !(
                        spanRight < rectLeft ||
                        spanLeft > rectRight ||
                        spanBottom < rectTop ||
                        spanTop > rectBottom
                    );

                    if (overlaps && span.textContent.trim()) {
                        extractedTexts.push(span.textContent.trim());
                    }
                });

                return extractedTexts.join(' ').trim();
            } catch (error) {
                console.warn('Error extracting text from rectangle:', error);
                return '';
            }
        },
        [scale]
    );

    const handleMouseDown = (e) => {
        if (selectedAnnotationTool === 'none') {
            return;
        }

        e.stopPropagation();
        setIsDragging(true);
        setDragStart({x: e.clientX, y: e.clientY});
        setInitialPosition({x: annotation.x, y: annotation.y});
    };

    const handleResizeStart = (e, handle) => {
        if (selectedAnnotationTool === 'none') {
            return;
        }

        e.stopPropagation();
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({x: e.clientX, y: e.clientY});
        setInitialPosition({x: annotation.x, y: annotation.y});
        setInitialSize({width: annotation.width, height: annotation.height});
    };

    const handleMouseMove = useCallback(
        (e) => {
            if (!isDragging && !isResizing) {
                return;
            }

            const deltaX = (e.clientX - dragStart.x) / scale;
            const deltaY = (e.clientY - dragStart.y) / scale;

            if (isDragging) {
                const newX = initialPosition.x + deltaX;
                const newY = initialPosition.y + deltaY;

                // Extract text at the new position
                const extractedText = extractTextFromRectangle(
                    newX,
                    newY,
                    annotation.width,
                    annotation.height
                );

                onUpdate(annotation.id, {
                    x: newX,
                    y: newY,
                    selected_text: extractedText,
                });
            } else if (isResizing) {
                // Calculate current normalized bounds
                const currentLeft = Math.min(initialPosition.x, initialPosition.x + initialSize.width);
                const currentTop = Math.min(initialPosition.y, initialPosition.y + initialSize.height);
                const currentRight = Math.max(initialPosition.x, initialPosition.x + initialSize.width);
                const currentBottom = Math.max(initialPosition.y, initialPosition.y + initialSize.height);

                let newLeft = currentLeft;
                let newTop = currentTop;
                let newRight = currentRight;
                let newBottom = currentBottom;

                switch (resizeHandle) {
                    case 'nw':
                        newLeft = currentLeft + deltaX;
                        newTop = currentTop + deltaY;
                        break;
                    case 'ne':
                        newRight = currentRight + deltaX;
                        newTop = currentTop + deltaY;
                        break;
                    case 'sw':
                        newLeft = currentLeft + deltaX;
                        newBottom = currentBottom + deltaY;
                        break;
                    case 'se':
                        newRight = currentRight + deltaX;
                        newBottom = currentBottom + deltaY;
                        break;
                    case 'n':
                        newTop = currentTop + deltaY;
                        break;
                    case 's':
                        newBottom = currentBottom + deltaY;
                        break;
                    case 'w':
                        newLeft = currentLeft + deltaX;
                        break;
                    case 'e':
                        newRight = currentRight + deltaX;
                        break;
                    default:
                        break;
                }

                // Calculate new dimensions
                const newWidth = newRight - newLeft;
                const newHeight = newBottom - newTop;

                // Ensure minimum size
                const minSize = MIN_RESIZE_SIZE / scale;
                if (Math.abs(newWidth) >= minSize && Math.abs(newHeight) >= minSize) {
                    // Extract text from the new rectangle area
                    const extractedText = extractTextFromRectangle(
                        newLeft,
                        newTop,
                        newWidth,
                        newHeight
                    );

                    onUpdate(annotation.id, {
                        x: newLeft,
                        y: newTop,
                        width: newWidth,
                        height: newHeight,
                        selected_text: extractedText,
                    });
                }
            }
        },
        [
            isDragging,
            isResizing,
            dragStart,
            initialPosition,
            initialSize,
            resizeHandle,
            scale,
            annotation.id,
            annotation.width,
            annotation.height,
            onUpdate,
            extractTextFromRectangle,
        ]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
        return () => {};
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    // Calculate normalized rectangle bounds for proper positioning
    const rectLeft = Math.min(annotation.x, annotation.x + annotation.width);
    const rectTop = Math.min(annotation.y, annotation.y + annotation.height);
    const rectWidth = Math.abs(annotation.width);
    const rectHeight = Math.abs(annotation.height);

    return (
        <div
            className="annotation-rectangle"
            style={{
                position: 'absolute',
                left: rectLeft * scale,
                top: rectTop * scale,
                width: rectWidth * scale,
                height: rectHeight * scale,
                border: ANNOTATION_STYLES.rectangle.border,
                backgroundColor: ANNOTATION_STYLES.rectangle.backgroundColor,
                zIndex: 5,
                cursor:
                    selectedAnnotationTool !== 'none'
                        ? isDragging
                            ? 'grabbing'
                            : isResizing
                            ? 'nwse-resize'
                            : 'grab'
                        : 'default',
            }}
            onMouseDown={handleMouseDown}
            title={
                annotation.selected_text
                    ? `"${annotation.selected_text}"`
                    : 'Rectangle annotation'
            }
        >
            <DeleteButton
                annotationId={annotation.id}
                onDelete={onDelete}
                selectedAnnotationTool={selectedAnnotationTool}
                style={{
                    top: '-8px',
                    right: '-8px',
                    zIndex: 15, // Higher than resize handles
                }}
            />
            
            {/* Resize handles - only show when annotation tool is active */}
            {selectedAnnotationTool !== 'none' && (
                <>
                    {/* Corner handles */}
                    <div
                        className="resize-handle resize-handle-nw"
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            left: '-4px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 'nw-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'nw')}
                    />
                    <div
                        className="resize-handle resize-handle-ne"
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 'ne-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'ne')}
                    />
                    <div
                        className="resize-handle resize-handle-sw"
                        style={{
                            position: 'absolute',
                            bottom: '-4px',
                            left: '-4px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 'sw-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'sw')}
                    />
                    <div
                        className="resize-handle resize-handle-se"
                        style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 'se-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                    />
                    
                    {/* Edge handles */}
                    <div
                        className="resize-handle resize-handle-n"
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 'n-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'n')}
                    />
                    <div
                        className="resize-handle resize-handle-s"
                        style={{
                            position: 'absolute',
                            bottom: '-4px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 's-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 's')}
                    />
                    <div
                        className="resize-handle resize-handle-w"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '-4px',
                            transform: 'translateY(-50%)',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 'w-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'w')}
                    />
                    <div
                        className="resize-handle resize-handle-e"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: '-4px',
                            transform: 'translateY(-50%)',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#3b82f6',
                            border: '1px solid white',
                            cursor: 'e-resize',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'e')}
                    />
                </>
            )}
        </div>
    );
};

RectangleAnnotation.propTypes = {
    annotation: PropTypes.object.isRequired,
    onDelete: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    selectedAnnotationTool: PropTypes.string.isRequired,
    scale: PropTypes.number,
};

// Comment Annotation Component
const CommentAnnotation = ({
    annotation,
    onDelete,
    onUpdate,
    selectedAnnotationTool,
    scale = 1.0,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({x: 0, y: 0});
    const [initialPosition, setInitialPosition] = useState({x: 0, y: 0});

    const handleMouseDown = (e) => {
        if (selectedAnnotationTool === 'none' || e.target.tagName === 'INPUT') {
            return;
        }

        e.stopPropagation();
        setIsDragging(true);
        setDragStart({x: e.clientX, y: e.clientY});
        setInitialPosition({x: annotation.x, y: annotation.y});
    };

    const handleMouseMove = useCallback(
        (e) => {
            if (!isDragging) {
                return;
            }

            const deltaX = (e.clientX - dragStart.x) / scale;
            const deltaY = (e.clientY - dragStart.y) / scale;

            onUpdate(annotation.id, {
                x: initialPosition.x + deltaX,
                y: initialPosition.y + deltaY,
            });
        },
        [isDragging, dragStart, initialPosition, scale, annotation.id, onUpdate]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
        return () => {};
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            className="annotation-comment"
            style={{
                position: 'absolute',
                left: annotation.x * scale,
                top: annotation.y * scale,
                zIndex: 10,
                cursor:
                    selectedAnnotationTool !== 'none'
                        ? isDragging
                            ? 'grabbing'
                            : 'grab'
                        : 'default',
            }}
            onMouseDown={handleMouseDown}
        >
            <input
                type="text"
                value={annotation.comment}
                onChange={(e) =>
                    selectedAnnotationTool !== 'none' &&
                    onUpdate(annotation.id, {
                        comment: e.target.value,
                    })
                }
                onClick={(e) => e.stopPropagation()}
                disabled={selectedAnnotationTool === 'none'}
                style={{
                    backgroundColor: ANNOTATION_STYLES.comment.backgroundColor,
                    border: ANNOTATION_STYLES.comment.border,
                    padding: '4px 8px',
                    fontSize: `${COMMENT_FONT_SIZE * scale}px`,
                    borderRadius: '4px',
                    minWidth: `${COMMENT_MIN_WIDTH * scale}px`,
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
    scale: PropTypes.number,
};

// Highlight Annotation Component
const HighlightAnnotation = ({
    annotation,
    onDelete,
    selectedAnnotationTool,
    scale = 1.0,
}) => {
    return (
        <div>
            <div
                className="annotation-highlight"
                style={{
                    position: 'absolute',
                    left: annotation.x * scale,
                    top: annotation.y * scale,
                    width: annotation.width * scale,
                    height: annotation.height * scale,
                    backgroundColor:
                        annotation.color ||
                        ANNOTATION_STYLES.highlight.defaultColor,
                    opacity: annotation.opacity || DEFAULT_OPACITY,
                    pointerEvents: 'none',
                    borderRadius: ANNOTATION_STYLES.highlight.borderRadius,
                    zIndex: 1,
                }}
                title={
                    annotation.selected_text
                        ? `"${annotation.selected_text}"`
                        : 'Highlighted text'
                }
            />
            <DeleteButton
                annotationId={annotation.id}
                onDelete={onDelete}
                selectedAnnotationTool={selectedAnnotationTool}
                style={{
                    left:
                        (annotation.x + annotation.width) * scale -
                        DELETE_BUTTON_OFFSET_X,
                    top: annotation.y * scale - DELETE_BUTTON_OFFSET_Y,
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
    scale: PropTypes.number,
};

// Drawing Preview Component
const DrawingPreview = ({currentAnnotation, scale = 1.0}) => {
    if (!currentAnnotation) {
        return null;
    }

    const dragDistance = Math.sqrt(
        Math.pow(currentAnnotation.width, 2) +
            Math.pow(currentAnnotation.height, 2)
    );

    const isValidDrag = dragDistance >= MIN_DRAG_DISTANCE;

    // Calculate normalized bounds for proper positioning
    const previewLeft = Math.min(currentAnnotation.x, currentAnnotation.x + currentAnnotation.width);
    const previewTop = Math.min(currentAnnotation.y, currentAnnotation.y + currentAnnotation.height);
    const previewWidth = Math.abs(currentAnnotation.width);
    const previewHeight = Math.abs(currentAnnotation.height);

    return (
        <div
            className="annotation-drawing"
            style={{
                position: 'absolute',
                left: previewLeft * scale,
                top: previewTop * scale,
                width: previewWidth * scale,
                height: previewHeight * scale,
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
    scale: PropTypes.number,
};

// Annotation Factory Function
const createAnnotationComponent = (annotation, handlers, scale = 1.0) => {
    const {onDelete, onUpdate, selectedAnnotationTool} = handlers;

    const commonProps = {
        key: annotation.id,
        annotation,
        onDelete,
        selectedAnnotationTool,
        scale,
    };

    switch (annotation.type) {
        case 'rectangle':
            return <RectangleAnnotation {...commonProps} onUpdate={onUpdate} />;
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
const _DashPdf = ({
    id,
    data,
    enableAnnotations = false,
    annotations = [],
    selectedAnnotationTool = 'none',
    scale = 1.0,
    onAnnotationAdd = null,
    onAnnotationDelete = null,
    onAnnotationUpdate = null,
    pageNumber = 1,
    enablePan = true,
    enableZoom = true,
    minScale = 0.5,
    maxScale = 3.0,
    // eslint-disable-next-line no-magic-numbers
    zoomStep = 0.1,
    setProps,
}) => {
    // const  = props;

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentAnnotation, setCurrentAnnotation] = useState(null);
    const [isTextSelecting, setIsTextSelecting] = useState(false);

    // Pan state
    const [isPanning, setIsPanning] = useState(false);
    const [panOffset, setPanOffset] = useState({x: 0, y: 0});
    const [lastPanPoint, setLastPanPoint] = useState({x: 0, y: 0});

    const containerRef = useRef(null);

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

    // Generate UUID with fallback for older browsers
    const generateUUID = useCallback(() => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
            /[xy]/g,
            function (c) {
                // eslint-disable-next-line no-magic-numbers
                const r = (Math.random() * 16) | 0;
                // eslint-disable-next-line no-magic-numbers
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                // eslint-disable-next-line no-magic-numbers
                return v.toString(16);
            }
        );
    }, []);

    const createAnnotation = useCallback(
        (baseProps) => ({
            id: `${baseProps.type}-${generateUUID()}`,
            timestamp: new Date().toISOString(),
            page: pageNumber,
            ...baseProps,
        }),
        [pageNumber, generateUUID]
    );

    const getRelativePosition = useCallback(
        (e) => {
            const rect = containerRef.current.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) / scale,
                y: (e.clientY - rect.top) / scale,
            };
        },
        [scale]
    );

    // Pan handlers
    const handlePanStart = useCallback(
        (e) => {
            if (!enablePan || isAnnotationToolActive) {
                return;
            }

            setIsPanning(true);
            setLastPanPoint({x: e.clientX, y: e.clientY});
            e.preventDefault();
        },
        [enablePan, isAnnotationToolActive]
    );

    const handlePanMove = useCallback(
        (e) => {
            if (!isPanning || !enablePan) {
                return;
            }

            const deltaX = e.clientX - lastPanPoint.x;
            const deltaY = e.clientY - lastPanPoint.y;

            setPanOffset((prev) => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY,
            }));

            setLastPanPoint({x: e.clientX, y: e.clientY});
            e.preventDefault();
        },
        [isPanning, enablePan, lastPanPoint]
    );

    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Zoom handler
    const handleWheel = useCallback(
        (e) => {
            if (!enableZoom) {
                return;
            }

            e.preventDefault();

            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            const newScale = Math.max(
                minScale,
                Math.min(maxScale, scale + delta)
            );

            if (newScale !== scale) {
                updateProps({scale: newScale});
            }
        },
        [enableZoom, scale, zoomStep, minScale, maxScale, updateProps]
    );

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

        const x = (rangeRect.left - containerRect.left) / scale;
        const y = (rangeRect.top - containerRect.top) / scale;
        const width = rangeRect.width / scale;
        const height = rangeRect.height / scale;

        if (width > MIN_HIGHLIGHT_DISTANCE && height > MIN_HIGHLIGHT_DISTANCE) {
            const highlightAnnotation = createAnnotation({
                type: 'highlight',
                x,
                y,
                width,
                height,
                selected_text: selectedText,
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

    // Double-click handler for comment tool
    const handleDoubleClick = useCallback(
        (e) => {
            if (
                !isAnnotationToolActive ||
                selectedAnnotationTool !== 'comment' ||
                e.target.closest('.annotation-comment, .annotation-rectangle')
            ) {
                return;
            }

            const {x, y} = getRelativePosition(e);
            const commentAnnotation = createAnnotation({
                type: 'comment',
                x,
                y,
                width: 0,
                height: 0,
                comment: 'Edit this text',
            });
            addAnnotation(commentAnnotation);
        },
        [
            isAnnotationToolActive,
            selectedAnnotationTool,
            getRelativePosition,
            createAnnotation,
            addAnnotation,
        ]
    );

    // Text extraction utility for rectangles
    const extractTextFromRectangle = useCallback(
        (x, y, width, height) => {
            try {
                const textLayer = containerRef.current?.querySelector(
                    '.react-pdf__Page__textContent'
                );
                if (!textLayer) {
                    return '';
                }

                const textElements = textLayer.querySelectorAll('span');
                const extractedTexts = [];

                // Convert rectangle coordinates to absolute positions
                const rectLeft = Math.min(x, x + width) * scale;
                const rectTop = Math.min(y, y + height) * scale;
                const rectRight = Math.max(x, x + width) * scale;
                const rectBottom = Math.max(y, y + height) * scale;

                textElements.forEach((span) => {
                    const rect = span.getBoundingClientRect();
                    const containerRect =
                        containerRef.current.getBoundingClientRect();

                    // Convert to relative coordinates
                    const spanLeft = rect.left - containerRect.left;
                    const spanTop = rect.top - containerRect.top;
                    const spanRight = rect.right - containerRect.left;
                    const spanBottom = rect.bottom - containerRect.top;

                    // Check if text element overlaps with rectangle
                    const overlaps = !(
                        spanRight < rectLeft ||
                        spanLeft > rectRight ||
                        spanBottom < rectTop ||
                        spanTop > rectBottom
                    );

                    if (overlaps && span.textContent.trim()) {
                        extractedTexts.push(span.textContent.trim());
                    }
                });

                return extractedTexts.join(' ').trim();
            } catch (error) {
                console.warn('Error extracting text from rectangle:', error);
                return '';
            }
        },
        [scale]
    );

    // Drawing handlers for rectangle tool
    const handleMouseDown = useCallback(
        (e) => {
            if (
                !isAnnotationToolActive ||
                selectedAnnotationTool === 'highlight' ||
                selectedAnnotationTool === 'none' ||
                selectedAnnotationTool === 'comment' ||
                e.target.closest('.annotation-comment, .annotation-rectangle')
            ) {
                return;
            }

            const {x, y} = getRelativePosition(e);

            // Handle rectangle tool with drag
            setIsDrawing(true);

            const newAnnotation = createAnnotation({
                type: selectedAnnotationTool,
                x,
                y,
                width: 0,
                height: 0,
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
                selectedAnnotationTool === 'comment' ||
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
            selectedAnnotationTool === 'comment' ||
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
                // Extract text from the rectangle area for rectangle annotations
                let annotationWithText = currentAnnotation;
                if (selectedAnnotationTool === 'rectangle') {
                    const extractedText = extractTextFromRectangle(
                        currentAnnotation.x,
                        currentAnnotation.y,
                        currentAnnotation.width,
                        currentAnnotation.height
                    );
                    annotationWithText = {
                        ...currentAnnotation,
                        selected_text: extractedText,
                    };
                }

                addAnnotation(annotationWithText);
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
        extractTextFromRectangle,
    ]);

    // Get appropriate mouse handlers based on selected tool and pan state
    const getMouseHandlers = useCallback(() => {
        // Pan handlers take priority when no annotation tool is active
        if (!isAnnotationToolActive && enablePan) {
            return {
                onMouseDown: handlePanStart,
                onMouseMove: handlePanMove,
                onMouseUp: handlePanEnd,
                onMouseLeave: handlePanEnd,
            };
        }

        // Annotation handlers
        if (isAnnotationToolActive && selectedAnnotationTool !== 'none') {
            switch (selectedAnnotationTool) {
                case 'highlight':
                    return {};
                case 'comment':
                    return {
                        onDoubleClick: handleDoubleClick,
                    };
                default:
                    return {
                        onMouseDown: handleMouseDown,
                        onMouseMove: handleMouseMove,
                        onMouseUp: handleMouseUp,
                    };
            }
        }

        return {};
    }, [
        isAnnotationToolActive,
        enablePan,
        selectedAnnotationTool,
        handlePanStart,
        handlePanMove,
        handlePanEnd,
        handleDoubleClick,
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
                        } ${
                            enablePan && !isAnnotationToolActive
                                ? 'pan-enabled'
                                : ''
                        }`}
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            userSelect:
                                selectedAnnotationTool === 'highlight'
                                    ? 'text'
                                    : 'none',
                            cursor: isPanning
                                ? 'grabbing'
                                : enablePan && !isAnnotationToolActive
                                ? 'grab'
                                : selectedAnnotationTool === 'none'
                                ? 'default'
                                : 'auto',
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                            transition: isPanning
                                ? 'none'
                                : 'transform 0.1s ease-out',
                        }}
                        onWheel={handleWheel}
                        {...mouseHandlers}
                    >
                        <Document
                            file={data}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(error) =>
                                console.error('Error loading PDF:', error)
                            }
                        >
                            <Page
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
                                    annotationHandlers,
                                    scale
                                )
                            )}

                        {/* Current drawing annotation preview */}
                        {isAnnotationToolActive &&
                            currentAnnotation &&
                            selectedAnnotationTool !== 'highlight' &&
                            selectedAnnotationTool !== 'none' &&
                            selectedAnnotationTool !== 'comment' && (
                                <DrawingPreview
                                    currentAnnotation={currentAnnotation}
                                    scale={scale}
                                />
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
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

    /** Whether pan functionality is enabled (default: true) */
    enablePan: PropTypes.bool,

    /** Whether zoom functionality is enabled (default: true) */
    enableZoom: PropTypes.bool,

    /** Minimum scale factor for zooming (default: 0.5) */
    minScale: PropTypes.number,

    /** Maximum scale factor for zooming (default: 3.0) */
    maxScale: PropTypes.number,

    /** Step size for zoom increments (default: 0.1) */
    zoomStep: PropTypes.number,
};

export default _DashPdf;
