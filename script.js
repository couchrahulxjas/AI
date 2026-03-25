const ROWS = 17, COLS = 23;
const MAX_CELLS = ROWS * COLS;
let startId = 8 * COLS + 3;
let endId = 8 * COLS + 19;

const wallGrid = new Uint8Array(MAX_CELLS);
const hazardGrid = new Uint8Array(MAX_CELLS);
const visited = new Uint8Array(MAX_CELLS);
const cameFrom = new Int32Array(MAX_CELLS);
const distArray = new Float32Array(MAX_CELLS);
const fCostArray = new Float32Array(MAX_CELLS);

let gridEl;
let animReq;
let isAnimating = false;
let isDraggingStart = false;
let isDraggingEnd = false;
let isPaintingWall = false;
let isPaintingHazard = false;
let isErasing = false;

class MinHeap {
    constructor() { this.data = []; }
    push(val, cost) {
        this.data.push({ val, cost });
        let idx = this.data.length - 1;
        while (idx > 0) {
            let pIdx = (idx - 1) >> 1;
            if (this.data[pIdx].cost <= this.data[idx].cost) break;
            let tmp = this.data[pIdx];
            this.data[pIdx] = this.data[idx];
            this.data[idx] = tmp;
            idx = pIdx;
        }
    }
    pop() {
        if (this.data.length === 0) return null;
        if (this.data.length === 1) return this.data.pop();
        let root = this.data[0];
        this.data[0] = this.data.pop();
        let idx = 0;
        let len = this.data.length;
        while (true) {
            let left = (idx << 1) + 1;
            let right = left + 1;
            let swap = -1;
            if (left < len && this.data[left].cost < this.data[idx].cost) swap = left;
            if (right < len && this.data[right].cost < (swap === -1 ? this.data[idx].cost : this.data[left].cost)) swap = right;
            if (swap === -1) break;
            let tmp = this.data[swap];
            this.data[swap] = this.data[idx];
            this.data[idx] = tmp;
            idx = swap;
        }
        return root;
    }
    isEmpty() { return this.data.length === 0; }
}

function getNeighbors(idx) {
    let r = Math.floor(idx / COLS), c = idx % COLS;
    let n = [];
    if (r > 0) n.push(idx - COLS);
    if (c < COLS - 1) n.push(idx + 1);
    if (r < ROWS - 1) n.push(idx + COLS);
    if (c > 0) n.push(idx - 1);
    return n;
}

function paintCell(i) {
    let dom = gridEl.children[i];
    if (isPaintingWall) {
        wallGrid[i] = 1; hazardGrid[i] = 0; dom.className = 'node wall';
    } else if (isPaintingHazard) {
        hazardGrid[i] = 1; wallGrid[i] = 0; dom.className = 'node hazard';
    } else if (isErasing) {
        wallGrid[i] = 0; hazardGrid[i] = 0; dom.className = 'node empty';
    }
}

window.onload = () => {
    gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';

    // Global mouseup to stop dragging/painting
    window.addEventListener('mouseup', (e) => {
        isDraggingStart = false;
        isDraggingEnd = false;
        isPaintingWall = false;
        isPaintingHazard = false;
        isErasing = false;
    });

    // Prevent default context menu on the grid
    gridEl.addEventListener('contextmenu', e => e.preventDefault());

    for (let i = 0; i < MAX_CELLS; i++) {
        let div = document.createElement('div');
        div.id = 'cell-' + i;
        div.className = 'node empty';

        div.addEventListener('mousedown', (e) => {
            if (isAnimating || document.getElementById('run-btn').disabled) return;
            e.preventDefault();

            if (e.button === 2) {
                // Right click
                if (i !== startId && i !== endId) {
                    if (hazardGrid[i]) isErasing = true;
                    else isPaintingHazard = true;
                    paintCell(i);
                }
                return;
            }

            // Left click
            if (i === startId) {
                isDraggingStart = true;
            } else if (i === endId) {
                isDraggingEnd = true;
            } else {
                if (wallGrid[i]) isErasing = true;
                else isPaintingWall = true;
                paintCell(i);
            }
        });

        div.addEventListener('mouseenter', (e) => {
            if (isAnimating || document.getElementById('run-btn').disabled) return;
            if (isDraggingStart) {
                if (i !== endId) {
                    let oldDom = gridEl.children[startId];
                    oldDom.className = wallGrid[startId] ? 'node wall' : (hazardGrid[startId] ? 'node hazard' : 'node empty');
                    startId = i;
                    wallGrid[startId] = 0; hazardGrid[startId] = 0;
                    gridEl.children[startId].className = 'node start';
                }
            } else if (isDraggingEnd) {
                if (i !== startId) {
                    let oldDom = gridEl.children[endId];
                    oldDom.className = wallGrid[endId] ? 'node wall' : (hazardGrid[endId] ? 'node hazard' : 'node empty');
                    endId = i;
                    wallGrid[endId] = 0; hazardGrid[endId] = 0;
                    gridEl.children[endId].className = 'node end';
                }
            } else if (isPaintingWall || isPaintingHazard || isErasing) {
                if (i !== startId && i !== endId) {
                    paintCell(i);
                }
            }
        });

        gridEl.appendChild(div);
    }

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (isAnimating) cancelAnimationFrame(animReq);
        isAnimating = false;
        document.getElementById('run-btn').disabled = false;

        // Remove visuals but retain walls and hazards
        for (let i = 0; i < MAX_CELLS; i++) {
            if (i === startId || i === endId) continue;
            let dom = gridEl.children[i];
            if (dom.className.includes('exploring') || dom.className.includes('path')) {
                dom.className = wallGrid[i] ? 'node wall' : (hazardGrid[i] ? 'node hazard' : 'node empty');
            }
        }
        document.getElementById('stat-explored').innerText = '000';
        document.getElementById('stat-length').innerText = '—';
        updateStatusLabel('READY', 'status-ready', `SYSTEM RESET — custom map state preserved`);
    });

    document.getElementById('scenario').addEventListener('change', (e) => {
        if (isAnimating) cancelAnimationFrame(animReq);
        isAnimating = false;
        document.getElementById('run-btn').disabled = false;
        loadScenario(e.target.value);
    });

    document.getElementById('algorithm').addEventListener('change', (e) => {
        let name = e.target.options[e.target.selectedIndex].text.split(' —')[0];
        document.getElementById('stat-algo').innerText = name;
    });

    document.getElementById('run-btn').addEventListener('click', () => {
        if (isAnimating) return;
        prepareGridForRun();

        let algoId = document.getElementById('algorithm').value;
        let res = runAlgorithm(algoId);
        animateResult(res.visitedOrder, res.path);
    });

    // Initial setup
    document.getElementById('stat-algo').innerText = document.getElementById('algorithm').options[document.getElementById('algorithm').selectedIndex].text.split(' —')[0];
    loadScenario('flood');
};

function prepareGridForRun() {
    for (let i = 0; i < MAX_CELLS; i++) {
        if (i === startId || i === endId) continue;
        let dom = gridEl.children[i];
        if (dom.className.includes('exploring') || dom.className.includes('path')) {
            dom.className = wallGrid[i] ? 'node wall' : (hazardGrid[i] ? 'node hazard' : 'node empty');
        }
    }
    document.getElementById('stat-explored').innerText = '000';
    document.getElementById('stat-length').innerText = '—';
    updateStatusLabel('RUNNING', 'status-running', `RUNNING ${document.getElementById('stat-algo').innerText}...`);
    document.getElementById('run-btn').disabled = true;
}

function updateStatusLabel(shortText, cls, longText) {
    let st = document.getElementById('stat-status');
    st.innerText = shortText;
    st.className = `value ${cls}`;
    if (longText) document.getElementById('status-bar').innerText = longText;
}

function loadScenario(type) {
    wallGrid.fill(0);
    hazardGrid.fill(0);

    if (type === 'flood') {
        for (let c = 5; c < 20; c += 4) {
            for (let r = 0; r < 14; r++) wallGrid[r * COLS + c] = 1;
        }
        for (let c = 7; c < 22; c += 4) {
            for (let r = 4; r < ROWS; r++) wallGrid[r * COLS + c] = 1;
        }
        for (let r = 1; r < 5; r++) {
            for (let c = 15; c < 22; c++) hazardGrid[r * COLS + c] = 1;
        }
    } else if (type === 'fire') {
        for (let i = 0; i < MAX_CELLS; i++) {
            if (i !== startId && i !== endId && Math.random() < 0.15) wallGrid[i] = 1;
        }
        for (let r = 12; r < 16; r++) {
            for (let c = 14; c < 22; c++) hazardGrid[r * COLS + c] = 1;
        }
    } else if (type === 'earthquake') {
        for (let r = 2; r < ROWS - 2; r += 2) {
            for (let c = 2; c < COLS - 2; c += 2) {
                wallGrid[r * COLS + c] = 1;
                wallGrid[(r + 1) * COLS + c] = 1;
            }
        }
        for (let r = 6; r < 11; r++) {
            for (let c = 9; c < 14; c++) hazardGrid[r * COLS + c] = 1;
        }
    } else if (type === 'tsunami') { // massive continuous hazard blocks
        for (let r = 12; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (Math.random() < 0.8) hazardGrid[r * COLS + c] = 1;
            }
        }
        for (let i = 0; i < MAX_CELLS; i++) {
            if (Math.random() < 0.1 && Math.floor(i / COLS) < 12) wallGrid[i] = 1;
        }
    } else if (type === 'meteor') { // multiple hazard craters
        let centers = [
            { r: 4, c: 10 }, { r: 12, c: 6 }, { r: 8, c: 18 }
        ];
        for (let ctr of centers) {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    let d = Math.abs(r - ctr.r) + Math.abs(c - ctr.c);
                    if (d <= 2) hazardGrid[r * COLS + c] = 1;
                    else if (d === 3 && Math.random() < 0.5) wallGrid[r * COLS + c] = 1;
                }
            }
        }
    } else if (type === 'random') {
        for (let i = 0; i < MAX_CELLS; i++) {
            if (i !== startId && i !== endId && Math.random() < 0.18) wallGrid[i] = 1;
        }
        let hazCount = 8;
        while (hazCount > 0) {
            let id = Math.floor(Math.random() * MAX_CELLS);
            if (id !== startId && id !== endId && !wallGrid[id] && !hazardGrid[id]) {
                hazardGrid[id] = 1; hazCount--;
            }
        }
    }

    // Ensure start and end points stand out and ignore setup overlaps safely
    wallGrid[startId] = 0; hazardGrid[startId] = 0;
    wallGrid[endId] = 0; hazardGrid[endId] = 0;

    for (let i = 0; i < MAX_CELLS; i++) {
        let dom = gridEl.children[i];
        if (i === startId) { dom.className = 'node start'; continue; }
        if (i === endId) { dom.className = 'node end'; continue; }
        if (wallGrid[i]) dom.className = 'node wall';
        else if (hazardGrid[i]) dom.className = 'node hazard';
        else dom.className = 'node empty';
    }

    document.getElementById('stat-explored').innerText = '000';
    document.getElementById('stat-length').innerText = '—';

    let msg = `SCENARIO LOADED — ${type} — initialized`;
    if (type === 'flood') msg = `SCENARIO LOADED — flood — rising water from east`;
    if (type === 'fire') msg = `SCENARIO LOADED — fire — scattered fires spreading`;
    if (type === 'earthquake') msg = `SCENARIO LOADED — earthquake — collapsed structures`;
    if (type === 'tsunami') msg = `SCENARIO LOADED — tsunami — critical coastal flooding`;
    if (type === 'meteor') msg = `SCENARIO LOADED — meteor — multiple impact craters`;
    if (type === 'random') msg = `SCENARIO LOADED — random — unknown hazard zone`;
    updateStatusLabel('READY', 'status-ready', msg);
    document.getElementById('run-btn').disabled = false;
}

function runAlgorithm(algoId) {
    visited.fill(0);
    cameFrom.fill(-1);
    distArray.fill(Infinity);
    fCostArray.fill(Infinity);

    let visitedOrder = [];
    let path = [];
    let found = false;

    if (algoId === 'bfs') {
        let q = [startId];
        visited[startId] = 1;
        let head = 0;
        while (head < q.length) {
            let curr = q[head++];
            visitedOrder.push(curr);
            if (curr === endId) { found = true; break; }
            for (let n of getNeighbors(curr)) {
                if (!wallGrid[n] && visited[n] === 0) {
                    visited[n] = 1;
                    cameFrom[n] = curr;
                    q.push(n);
                }
            }
        }
    } else if (algoId === 'dfs') {
        let stack = [startId];
        while (stack.length > 0) {
            let curr = stack.pop();
            if (visited[curr]) continue;
            visited[curr] = 1;
            visitedOrder.push(curr);
            if (curr === endId) { found = true; break; }
            let nbs = getNeighbors(curr).reverse();
            for (let n of nbs) {
                if (!wallGrid[n] && visited[n] === 0) {
                    cameFrom[n] = curr;
                    stack.push(n);
                }
            }
        }
    } else if (algoId === 'dls') {
        let stack = [{ id: startId, d: 0, path: [startId] }];
        const depthArray = new Int32Array(MAX_CELLS);
        depthArray.fill(999999);

        while (stack.length > 0) {
            let { id: curr, d: depth, path: currentPath } = stack.pop();
            if (depth > 24) continue;
            if (depthArray[curr] <= depth) continue;
            depthArray[curr] = depth;
            visited[curr] = 1;

            if (visitedOrder.indexOf(curr) === -1) visitedOrder.push(curr);
            if (curr === endId) { found = true; path = currentPath; break; }

            let nbs = getNeighbors(curr).reverse();
            for (let n of nbs) {
                if (!wallGrid[n]) {
                    let newPath = currentPath.slice();
                    newPath.push(n);
                    stack.push({ id: n, d: depth + 1, path: newPath });
                }
            }
        }
    } else if (algoId === 'ucs') {
        let heap = new MinHeap();
        distArray[startId] = 0;
        heap.push(startId, 0);

        while (!heap.isEmpty()) {
            let curr = heap.pop().val;
            if (visited[curr]) continue;
            visited[curr] = 1;
            visitedOrder.push(curr);
            if (curr === endId) { found = true; break; }

            for (let n of getNeighbors(curr)) {
                if (!wallGrid[n] && !visited[n]) {
                    let cost = hazardGrid[n] ? 5 : 1;
                    let newDist = distArray[curr] + cost;
                    if (newDist < distArray[n]) {
                        distArray[n] = newDist;
                        cameFrom[n] = curr;
                        heap.push(n, newDist);
                    }
                }
            }
        }
    } else if (algoId === 'greedy') {
        let heap = new MinHeap();
        let endR = Math.floor(endId / COLS), endC = endId % COLS;
        let getH = (id) => Math.abs(Math.floor(id / COLS) - endR) + Math.abs(id % COLS - endC);

        heap.push(startId, getH(startId));

        while (!heap.isEmpty()) {
            let curr = heap.pop().val;
            if (visited[curr]) continue;
            visited[curr] = 1;
            visitedOrder.push(curr);
            if (curr === endId) { found = true; break; }

            for (let n of getNeighbors(curr)) {
                if (!wallGrid[n] && !visited[n]) {
                    cameFrom[n] = curr;
                    heap.push(n, getH(n));
                }
            }
        }
    } else if (algoId === 'astar') {
        let heap = new MinHeap();
        let endR = Math.floor(endId / COLS), endC = endId % COLS;
        let getH = (id) => Math.abs(Math.floor(id / COLS) - endR) + Math.abs(id % COLS - endC);

        distArray[startId] = 0;
        fCostArray[startId] = getH(startId);
        heap.push(startId, fCostArray[startId]);

        while (!heap.isEmpty()) {
            let curr = heap.pop().val;
            if (visited[curr]) continue;
            visited[curr] = 1;
            visitedOrder.push(curr);
            if (curr === endId) { found = true; break; }

            for (let n of getNeighbors(curr)) {
                if (!wallGrid[n] && !visited[n]) {
                    let cost = hazardGrid[n] ? 5 : 1;
                    let newDist = distArray[curr] + cost;
                    if (newDist < distArray[n]) {
                        distArray[n] = newDist;
                        fCostArray[n] = newDist + getH(n);
                        cameFrom[n] = curr;
                        heap.push(n, fCostArray[n]);
                    }
                }
            }
        }
    }

    if (found && algoId !== 'dls') {
        let step = endId;
        while (step !== startId && step !== -1) {
            path.push(step);
            step = cameFrom[step];
        }
        path.push(startId);
        path.reverse();
    }
    return { visitedOrder, path, found };
}

function animateResult(visitedOrder, pathOrder) {
    isAnimating = true;
    let vIdx = 0;
    let pIdx = 0;

    let speedVal = parseInt(document.getElementById('speed').value);
    let cps = 1;
    if (speedVal === 10) cps = MAX_CELLS;
    else if (speedVal === 7) cps = 10;
    else if (speedVal > 7) cps = 10 + (speedVal - 7) * 5;
    else cps = speedVal;

    let pCps = Math.max(1, Math.floor(cps / 2));
    if (speedVal === 10) pCps = MAX_CELLS;

    function frame() {
        if (!isAnimating) return;

        let vDrawCount = 0;
        while (vIdx < visitedOrder.length && vDrawCount < cps) {
            let id = visitedOrder[vIdx];
            if (id !== startId && id !== endId) {
                gridEl.children[id].className = 'node exploring';
            }
            vIdx++; vDrawCount++;
            document.getElementById('stat-explored').innerText = String(vIdx).padStart(3, '0');
        }

        if (vIdx >= visitedOrder.length) {
            let pDrawCount = 0;
            while (pIdx < pathOrder.length && pDrawCount < pCps) {
                let id = pathOrder[pIdx];
                if (id !== startId && id !== endId) {
                    gridEl.children[id].className = 'node path';
                }
                pIdx++; pDrawCount++;
                document.getElementById('stat-length').innerText = pIdx;
            }
        }

        if (vIdx < visitedOrder.length || pIdx < pathOrder.length) {
            animReq = requestAnimationFrame(frame);
        } else {
            isAnimating = false;
            let count = pathOrder.length;
            if (count > 0) {
                updateStatusLabel('ROUTE FOUND', 'status-found', `ROUTE SECURED — ${count} cells via ${document.getElementById('stat-algo').innerText}`);
            } else {
                updateStatusLabel('NO ROUTE', 'status-noroute', `NO ROUTE FOUND — all paths blocked`);
            }
        }
    }

    animReq = requestAnimationFrame(frame);
}
