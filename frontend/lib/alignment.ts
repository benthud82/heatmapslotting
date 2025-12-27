import { WarehouseElement } from '@/lib/types';

export type AlignmentType = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'distributeH' | 'distributeV';

export function alignElements(elements: WarehouseElement[], type: AlignmentType): WarehouseElement[] {
    if (elements.length < 2) return elements;

    // Handle distribution types
    if (type === 'distributeH' || type === 'distributeV') {
        return distributeElements(elements, type === 'distributeH' ? 'horizontal' : 'vertical');
    }

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let avgX = 0, avgY = 0;

    elements.forEach(el => {
        minX = Math.min(minX, el.x_coordinate);
        maxX = Math.max(maxX, el.x_coordinate + el.width);
        minY = Math.min(minY, el.y_coordinate);
        maxY = Math.max(maxY, el.y_coordinate + el.height);
        avgX += el.x_coordinate + el.width / 2;
        avgY += el.y_coordinate + el.height / 2;
    });

    avgX /= elements.length;
    avgY /= elements.length;

    return elements.map(el => {
        const newEl = { ...el };
        switch (type) {
            case 'left':
                newEl.x_coordinate = minX;
                break;
            case 'centerH':
                newEl.x_coordinate = avgX - el.width / 2;
                break;
            case 'right':
                newEl.x_coordinate = maxX - el.width;
                break;
            case 'top':
                newEl.y_coordinate = minY;
                break;
            case 'centerV':
                newEl.y_coordinate = avgY - el.height / 2;
                break;
            case 'bottom':
                newEl.y_coordinate = maxY - el.height;
                break;
        }
        return newEl;
    });
}

function distributeElements(elements: WarehouseElement[], type: 'horizontal' | 'vertical'): WarehouseElement[] {
    if (elements.length < 3) return elements;

    // Sort elements by position
    const sorted = [...elements].sort((a, b) => {
        if (type === 'horizontal') return a.x_coordinate - b.x_coordinate;
        return a.y_coordinate - b.y_coordinate;
    });

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (type === 'horizontal') {
        const start = first.x_coordinate;
        const end = last.x_coordinate;
        const step = (end - start) / (sorted.length - 1);

        return sorted.map((el, i) => ({
            ...el,
            x_coordinate: start + (step * i)
        }));
    } else {
        const start = first.y_coordinate;
        const end = last.y_coordinate;
        const step = (end - start) / (sorted.length - 1);

        return sorted.map((el, i) => ({
            ...el,
            y_coordinate: start + (step * i)
        }));
    }
}
