import Konva from 'konva';

/**
 * Export a Konva Stage to PNG
 */
export function exportStageAsPNG(stage: Konva.Stage, filename: string = 'warehouse-layout.png') {
    const dataURL = stage.toDataURL({ pixelRatio: 2 });

    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export a Konva Stage to PDF
 * Note: This is a simplified implementation that converts to image first
 * For true vector PDF, you'd need a library like jsPDF with svg2pdf
 */
export async function exportStageAsPDF(stage: Konva.Stage, filename: string = 'warehouse-layout.pdf') {
    // For PDF export, we'll use jsPDF if available, otherwise fall back to PNG
    try {
        // Dynamic import to avoid bundling if not used
        const jsPDF = (await import('jspdf')).default;

        const dataURL = stage.toDataURL({ pixelRatio: 2 });

        // Get stage dimensions
        const width = stage.width();
        const height = stage.height();

        // Create PDF with appropriate orientation
        const orientation = width > height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [width, height]
        });

        // Add image to PDF
        pdf.addImage(dataURL, 'PNG', 0, 0, width, height);

        // Save PDF
        pdf.save(filename);
    } catch (error) {
        // Fallback to PNG export if jsPDF is not available
        console.warn('PDF export failed, falling back to PNG:', error);
        exportStageAsPNG(stage, filename.replace('.pdf', '.png'));
    }
}
