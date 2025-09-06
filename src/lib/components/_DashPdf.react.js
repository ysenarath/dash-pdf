import React, {useState, useRef, useCallback} from 'react';
import PropTypes from 'prop-types';
import {Document, Page} from 'react-pdf';
import {pdfjs} from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
        buttonClassName,
        labelClassName,
        controlsClassName,
        enableAnnotations,
        annotations,
        selectedAnnotationTool,
        annotationToolbarClassName,
        annotationButtonClassName,
        showAnnotationSidebar,
        sidebarClassName,
        scale,
        onAnnotationAdd,
        onAnnotationDelete,
        onAnnotationUpdate,
    } = props;

    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [internalAnnotations, setInternalAnnotations] = useState(
        annotations || []
    );
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentAnnotation, setCurrentAnnotation] = useState(null);
    const containerRef = useRef(null);

    // Use controlled annotations if provided, otherwise use internal state
    const currentAnnotations = annotations || internalAnnotations;
    const updateAnnotations = setProps
        ? (newAnnotations) => setProps({annotations: newAnnotations})
        : setInternalAnnotations;

    function onDocumentLoadSuccess({numPages}) {
        setNumPages(numPages);
        setPageNumber(1);

        // Notify parent component if callback provided
        if (setProps) {
            setProps({numPages});
        }
    }

    function changePage(offset) {
        const newPageNumber = Math.max(
            1,
            Math.min(numPages, pageNumber + offset)
        );
        setPageNumber(newPageNumber);

        if (setProps) {
            setProps({pageNumber: newPageNumber});
        }
    }

    function previousPage() {
        changePage(-1);
    }

    function nextPage() {
        changePage(1);
    }

    const handleMouseDown = useCallback(
        (e) => {
            if (!enableAnnotations || selectedAnnotationTool === 'comment')
                return;

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
            if (!isDrawing || !currentAnnotation) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setCurrentAnnotation((prev) => ({
                ...prev,
                width: x - prev.x,
                height: y - prev.y,
            }));
        },
        [isDrawing, currentAnnotation]
    );

    const handleMouseUp = useCallback(() => {
        if (isDrawing && currentAnnotation) {
            const newAnnotations = [...currentAnnotations, currentAnnotation];
            updateAnnotations(newAnnotations);

            // Call callback if provided
            if (onAnnotationAdd) {
                onAnnotationAdd(currentAnnotation);
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
    ]);

    const addCommentAnnotation = useCallback(
        (e) => {
            if (!enableAnnotations || selectedAnnotationTool !== 'comment')
                return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // For Dash integration, we'll create the comment and let the parent handle the prompt
            const newAnnotation = {
                id: `comment_${Date.now()}`,
                type: 'comment',
                x,
                y,
                width: 20,
                height: 20,
                page: pageNumber,
                comment: 'New comment', // Default comment - can be updated via props
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

    const selectAnnotationTool = useCallback(
        (tool) => {
            if (setProps) {
                setProps({selectedAnnotationTool: tool});
            }
        },
        [setProps]
    );

    const currentPageAnnotations = currentAnnotations.filter(
        (ann) => ann.page === pageNumber
    );

    const annotationToolbar = enableAnnotations && (
        <div className={annotationToolbarClassName || 'annotation-toolbar'}>
            <button
                onClick={() => selectAnnotationTool('comment')}
                className={`${annotationButtonClassName || 'annotation-btn'} ${
                    selectedAnnotationTool === 'comment' ? 'active' : ''
                }`}
            >
                💬 Comment
            </button>
            <button
                onClick={() => selectAnnotationTool('rectangle')}
                className={`${annotationButtonClassName || 'annotation-btn'} ${
                    selectedAnnotationTool === 'rectangle' ? 'active' : ''
                }`}
            >
                ⬜ Rectangle
            </button>
            <button
                onClick={() => selectAnnotationTool('text')}
                className={`${annotationButtonClassName || 'annotation-btn'} ${
                    selectedAnnotationTool === 'text' ? 'active' : ''
                }`}
            >
                📝 Text
            </button>
        </div>
    );

    const annotationSidebar = enableAnnotations && showAnnotationSidebar && (
        <div className={sidebarClassName || 'annotation-sidebar'}>
            <h3>Annotations ({currentPageAnnotations.length})</h3>
            <div className="annotations-list">
                {currentPageAnnotations.map((annotation, index) => (
                    <div key={annotation.id} className="annotation-item">
                        <div className="annotation-header">
                            <span className="annotation-type">
                                {annotation.type === 'comment' && '💬'}
                                {annotation.type === 'rectangle' && '⬜'}
                                {annotation.type === 'text' && '📝'}
                                {annotation.type} #{index + 1}
                            </span>
                            <button
                                onClick={() => deleteAnnotation(annotation.id)}
                                className="delete-btn"
                            >
                                🗑️
                            </button>
                        </div>
                        {annotation.comment && (
                            <div className="annotation-content">
                                <strong>Comment:</strong>
                                <input
                                    type="text"
                                    value={annotation.comment}
                                    onChange={(e) =>
                                        updateAnnotationComment(
                                            annotation.id,
                                            e.target.value
                                        )
                                    }
                                    className="comment-input"
                                />
                            </div>
                        )}
                        {annotation.text && (
                            <div className="annotation-content">
                                <strong>Text:</strong>
                                <input
                                    type="text"
                                    value={annotation.text}
                                    onChange={(e) =>
                                        updateAnnotationText(
                                            annotation.id,
                                            e.target.value
                                        )
                                    }
                                    className="text-input"
                                />
                            </div>
                        )}
                        <div className="annotation-meta">
                            Position: ({Math.round(annotation.x)},{' '}
                            {Math.round(annotation.y)})
                        </div>
                    </div>
                ))}
                {currentPageAnnotations.length === 0 && (
                    <p className="no-annotations">
                        No annotations on this page.
                    </p>
                )}
            </div>
        </div>
    );

    const pdfContent = (
        <div
            ref={containerRef}
            className="pdf-container"
            style={{position: 'relative', display: 'inline-block'}}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={
                selectedAnnotationTool === 'comment'
                    ? addCommentAnnotation
                    : undefined
            }
        >
            <Document file={data} onLoadSuccess={onDocumentLoadSuccess}>
                <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={false}
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
                                    pointerEvents: 'none',
                                }}
                            >
                                <button
                                    onClick={() =>
                                        deleteAnnotation(annotation.id)
                                    }
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
                                        pointerEvents: 'auto',
                                    }}
                                >
                                    🗑️
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
                                    onClick={() =>
                                        deleteAnnotation(annotation.id)
                                    }
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
                                    🗑️
                                </button>
                            </div>
                        )}
                    </div>
                ))}

            {/* Current drawing annotation */}
            {enableAnnotations && currentAnnotation && (
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
                    }}
                />
            )}
        </div>
    );

    return (
        <div id={id} className="dash-pdf-container">
            {annotationToolbar}

            <div className={controlsClassName}>
                <p className={labelClassName}>
                    Page {pageNumber || (numPages ? 1 : '--')} of{' '}
                    {numPages || '--'}
                </p>
                <button
                    type="button"
                    disabled={pageNumber <= 1}
                    onClick={previousPage}
                    className={buttonClassName}
                >
                    Previous
                </button>
                <button
                    type="button"
                    disabled={pageNumber >= numPages}
                    onClick={nextPage}
                    className={buttonClassName}
                >
                    Next
                </button>
            </div>

            <div style={{display: 'flex'}}>
                <div style={{flex: 1}}>{pdfContent}</div>
                {annotationSidebar}
            </div>

            <style jsx>{`
                .annotation-toolbar {
                    padding: 10px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    gap: 8px;
                }

                .annotation-btn {
                    padding: 8px 16px;
                    border: 1px solid #d1d5db;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .annotation-btn.active {
                    background: #3b82f6;
                    color: white;
                }

                .annotation-sidebar {
                    width: 300px;
                    padding: 16px;
                    border-left: 1px solid #e5e7eb;
                    background: #f9fafb;
                    max-height: 600px;
                    overflow-y: auto;
                }

                .annotation-item {
                    background: white;
                    padding: 12px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    border: 1px solid #e5e7eb;
                }

                .annotation-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .annotation-content {
                    margin-bottom: 8px;
                }

                .comment-input,
                .text-input {
                    width: 100%;
                    padding: 4px;
                    border: 1px solid #d1d5db;
                    border-radius: 2px;
                    margin-top: 4px;
                }

                .annotation-meta {
                    font-size: 12px;
                    color: #6b7280;
                }

                .delete-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                }

                .no-annotations {
                    text-align: center;
                    color: #6b7280;
                    font-style: italic;
                    padding: 20px;
                }
            `}</style>
        </div>
    );
};

_DashPdf.defaultProps = {
    buttonClassName: '',
    labelClassName: '',
    controlsClassName: '',
    enableAnnotations: false,
    annotations: [],
    selectedAnnotationTool: 'comment',
    annotationToolbarClassName: '',
    annotationButtonClassName: '',
    showAnnotationSidebar: false,
    sidebarClassName: '',
    scale: 1.0,
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
     * CSS class name for the Previous and Next buttons.
     */
    buttonClassName: PropTypes.string,

    /**
     * CSS class name for the "Page X of Y" label.
     */
    labelClassName: PropTypes.string,

    /**
     * CSS class name for the parent div of label and buttons.
     */
    controlsClassName: PropTypes.string,

    /**
     * Enable annotation functionality.
     */
    enableAnnotations: PropTypes.bool,

    /**
     * Array of annotation objects. Each annotation should have:
     * - id: unique identifier
     * - type: 'comment', 'rectangle', or 'text'
     * - x, y: position coordinates
     * - width, height: dimensions (for rectangles)
     * - page: page number
     * - text: text content (for text annotations)
     * - comment: comment content (for comments)
     */
    annotations: PropTypes.arrayOf(PropTypes.object),

    /**
     * Currently selected annotation tool ('comment', 'rectangle', 'text').
     */
    selectedAnnotationTool: PropTypes.oneOf(['comment', 'rectangle', 'text']),

    /**
     * CSS class name for the annotation toolbar.
     */
    annotationToolbarClassName: PropTypes.string,

    /**
     * CSS class name for annotation toolbar buttons.
     */
    annotationButtonClassName: PropTypes.string,

    /**
     * Whether to show the annotation sidebar.
     */
    showAnnotationSidebar: PropTypes.bool,

    /**
     * CSS class name for the annotation sidebar.
     */
    sidebarClassName: PropTypes.string,

    /**
     * Scale factor for PDF rendering.
     */
    scale: PropTypes.number,

    /**
     * Current page number (controlled).
     */
    pageNumber: PropTypes.number,

    /**
     * Total number of pages (read-only).
     */
    numPages: PropTypes.number,

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
