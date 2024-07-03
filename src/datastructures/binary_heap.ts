// A BinaryHeap - implementing a fast priority Queue where the element with highest score
// can be removed in O(log n) and elements can be inserted in O(log n)
export class BinaryHeap<Value> {
    heap: { value: Value, score: number }[] = [];

    *removeMax(): Generator<void, Value | null> {
        if (this.heap.length === 0) {
            return null;
        }

        if (this.heap.length === 1) {
            return this.heap.pop()!.value;
        }

        const result = this.heap[0].value;
        this.heap[0] = this.heap.pop()!;
        yield* this.swapDown(0);

        return result;
    }

    *insert(value: Value, score: number): Generator<void, void> {
        const index = this.heap.length;
        this.heap.push({ value, score });
        yield* this.swapUp(index);
    }

    // Rebalances the heap by swapping a child with its parent, till the root is reached
    *swapUp(index: number = 0): Generator<void, void> {
        if (index === 0) return; // Reached the root node

        const parentIndex =  Math.floor((index - 1) / 2);

        if (this.score(parentIndex) >= this.score(index)) {
            return;
        }

        this.swap(parentIndex, index);
        yield* this.swapUp(parentIndex);
    }

    // Rebalances the heap by swapping down a node with its children
    *swapDown(index: number = 0): Generator<void, void> {
        const leftIndex = 2 * index + 1;
        const rightIndex = 2 * index + 2;

        if (!this.exists(leftIndex)) {
            // reached leaf node
            return;
        }

        if (this.exists(rightIndex) && this.score(rightIndex) > this.score(index) && this.score(rightIndex) > this.score(leftIndex)) {
            this.swap(index, rightIndex);
            yield* this.swapDown(rightIndex);
            return;
        }

        if (this.score(leftIndex) > this.score(index)) {
            this.swap(leftIndex, index);
            yield* this.swapDown(leftIndex);
            return;
        }
    }

    exists(index: number) {
        return index < this.heap.length;
    }

    score(index: number) {
        return this.heap[index].score;
    }

    swap(a: number, b: number) {
        const tmp = this.heap[a];
        this.heap[a] = this.heap[b];
        this.heap[b] = this.heap[a];
    }
};