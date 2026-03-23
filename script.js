const ROWS = 18;
const COLS = 22;
let grid = [];
let startNode = { r: 8, c: 4 };
let endNode = { r: 8, c: 16 };
let isRunning = false;
let timeoutIds = [];
let nodesVisitedCount = 0;
let pathLengthCount = 0;

let isDraggingStart = false;
let isDraggingEnd = false;

function updateStats() {
    document.getElementById('stat-visited').innerText = nodesVisitedCount;
    document.getElementById('stat-path').innerText = pathLengthCount;
}

function setStatus(status) {
    document.getElementById('stat-status').innerText = status;
}

const sleep = (ms) => new Promise(resolve => {
    const id = setTimeout(resolve, ms);
    timeoutIds.push(id);
});

function clearTimeouts() {
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds = [];
}

class SimplePQ {
    constructor() {
        this.elements = [];
    }
    enqueue(element, priority) {
        this.elements.push({ element, priority });
    }
    dequeue() {
        if (this.isEmpty()) return null;
        let minIndex = 0;
        for (let i = 1; i < this.elements.length; i++) {
            if (this.elements[i].priority < this.elements[minIndex].priority) {
                minIndex = i;
            }
        }
        return this.elements.splice(minIndex, 1)[0].element;
    }
    isEmpty() {
        return this.elements.length === 0;
    }
}

function moveStartNode(row, col) {
    if (grid[row][col].isEnd) return;
    const oldR = startNode.r;
    const oldC = startNode.c;
    grid[oldR][oldC].isStart = false;
    document.getElementById(`node-${oldR}-${oldC}`).className = grid[oldR][oldC].isWall ? 'node wall' : 'node unvisited';

    startNode = { r: row, c: col };
    grid[row][col].isStart = true;
    grid[row][col].isWall = false;
    document.getElementById(`node-${row}-${col}`).className = 'node start';
}

function moveEndNode(row, col) {
    if (grid[row][col].isStart) return;
    const oldR = endNode.r;
    const oldC = endNode.c;
    grid[oldR][oldC].isEnd = false;
    document.getElementById(`node-${oldR}-${oldC}`).className = grid[oldR][oldC].isWall ? 'node wall' : 'node unvisited';

    endNode = { r: row, c: col };
    grid[row][col].isEnd = true;
    grid[row][col].isWall = false;
    document.getElementById(`node-${row}-${col}`).className = 'node end';
}

function initializeGrid() {
    grid = [];
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';

    // Add global mouseup to cancel dragging if released outside grid
    gridEl.onmouseleave = () => {
        isDraggingStart = false;
        isDraggingEnd = false;
    };
    window.onmouseup = () => {
        isDraggingStart = false;
        isDraggingEnd = false;
    };

    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const node = {
                r, c,
                isWall: false,
                weight: 1,
                isStart: r === startNode.r && c === startNode.c,
                isEnd: r === endNode.r && c === endNode.c,
                isVisited: false,
                previousNode: null,
                cost: Infinity,
                gCost: Infinity,
                fCost: Infinity,
                queuedForGreedy: false,
                isVisitedDLS: false,
                visitedDepth: Infinity,
                isVisitedForCount: false
            };
            row.push(node);

            const div = document.createElement('div');
            div.id = `node-${r}-${c}`;
            div.className = 'node unvisited';
            if (node.isStart) {
                div.className = 'node start';
            } else if (node.isEnd) {
                div.className = 'node end';
            }

            // Mouse events for moving start/end nodes
            div.addEventListener('mousedown', (e) => {
                if (isRunning) return;
                e.preventDefault(); // Prevents selection artifacts
                if (node.isStart) {
                    isDraggingStart = true;
                } else if (node.isEnd) {
                    isDraggingEnd = true;
                }
            });

            div.addEventListener('mouseenter', (e) => {
                if (isRunning) return;
                if (isDraggingStart) {
                    moveStartNode(r, c);
                } else if (isDraggingEnd) {
                    moveEndNode(r, c);
                }
            });

            div.addEventListener('mouseup', () => {
                isDraggingStart = false;
                isDraggingEnd = false;
            });

            gridEl.appendChild(div);
        }
        grid.push(row);
    }
    nodesVisitedCount = 0;
    pathLengthCount = 0;
    updateStats();
    setStatus('Idling');
}

function generateMaze() {
    if (isRunning) return;
    const type = document.getElementById('maze').value;
    initializeGrid();
    if (type === 'basic') return;

    if (type === 'weighted') {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                let node = grid[r][c];
                if (!node.isStart && !node.isEnd) {
                    if (Math.random() < 0.25) {
                        node.weight = 5;
                        const el = document.getElementById(`node-${r}-${c}`);
                        el.classList.add('weight');
                        el.innerHTML = 'W'; // Indicates weight
                    }
                }
            }
        }
    } else if (type === 'obstacles') {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                let node = grid[r][c];
                if (!node.isStart && !node.isEnd) {
                    if (Math.random() < 0.25) {
                        node.isWall = true;
                        const el = document.getElementById(`node-${r}-${c}`);
                        el.className = 'node wall';
                    }
                }
            }
        }
    } else if (type === 'random') {
        // DFS Maze Generation
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                grid[r][c].isWall = true;
                const el = document.getElementById(`node-${r}-${c}`);
                el.className = 'node wall';
                el.innerHTML = '';
            }
        }

        const stack = [{ r: startNode.r, c: startNode.c }];
        grid[startNode.r][startNode.c].isWall = false;

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];
            const dirs = [[-2, 0], [2, 0], [0, -2], [0, 2]];

            for (const [dr, dc] of dirs) {
                const nr = current.r + dr;
                const nc = current.c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].isWall) {
                    neighbors.push({ r: nr, c: nc, dr, dc });
                }
            }

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];

                grid[current.r + next.dr / 2][current.c + next.dc / 2].isWall = false;
                grid[next.r][next.c].isWall = false;

                stack.push({ r: next.r, c: next.c });
            } else {
                stack.pop();
            }
        }

        grid[startNode.r][startNode.c].isWall = false;
        grid[endNode.r][endNode.c].isWall = false;

        // Make sure end node connects to the maze
        if (grid[endNode.r - 1][endNode.c].isWall && grid[endNode.r + 1][endNode.c].isWall &&
            grid[endNode.r][endNode.c - 1].isWall && grid[endNode.r][endNode.c + 1].isWall) {
            grid[endNode.r][endNode.c - 1].isWall = false;
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const node = grid[r][c];
                const el = document.getElementById(`node-${r}-${c}`);
                if (node.isStart) {
                    el.className = 'node start';
                } else if (node.isEnd) {
                    el.className = 'node end';
                } else if (node.isWall) {
                    el.className = 'node wall';
                } else {
                    el.className = 'node unvisited';
                }
            }
        }
    } else if (type === 'spiral') {
        for (let loop = 0; loop < Math.min(ROWS, COLS) / 2; loop += 2) {
            for (let c = loop; c < COLS - loop; c++) {
                if (!grid[loop][c].isStart && !grid[loop][c].isEnd) {
                    grid[loop][c].isWall = true;
                    document.getElementById(`node-${loop}-${c}`).className = 'node wall';
                }
            }
            for (let r = loop; r < ROWS - loop; r++) {
                if (!grid[r][COLS - 1 - loop].isStart && !grid[r][COLS - 1 - loop].isEnd) {
                    grid[r][COLS - 1 - loop].isWall = true;
                    document.getElementById(`node-${r}-${COLS - 1 - loop}`).className = 'node wall';
                }
            }
            for (let c = loop; c < COLS - loop; c++) {
                if (!grid[ROWS - 1 - loop][c].isStart && !grid[ROWS - 1 - loop][c].isEnd) {
                    grid[ROWS - 1 - loop][c].isWall = true;
                    document.getElementById(`node-${ROWS - 1 - loop}-${c}`).className = 'node wall';
                }
            }
            for (let r = loop + 2; r < ROWS - loop; r++) {
                if (!grid[r][loop].isStart && !grid[r][loop].isEnd) {
                    grid[r][loop].isWall = true;
                    document.getElementById(`node-${r}-${loop}`).className = 'node wall';
                }
            }
        }
    } else if (type === 'staircase') {
        let currentR = ROWS - 2;
        let currentC = 1;
        while (currentC < COLS - 1) {
            if (currentR !== 0 && currentR !== ROWS - 1 && Math.random() > 0.05) {
                if (!grid[currentR][currentC].isStart && !grid[currentR][currentC].isEnd) {
                    grid[currentR][currentC].isWall = true;
                    document.getElementById(`node-${currentR}-${currentC}`).className = 'node wall';
                }
            }
            currentR--;
            currentC++;

            if (currentR < 0) {
                currentR = ROWS - 2;
                currentC += 2;
            }
        }
    } else if (type === 'stripes') {
        for (let c = 2; c < COLS - 1; c += 3) {
            let gap = Math.floor(Math.random() * (ROWS - 2)) + 1;
            for (let r = 0; r < ROWS; r++) {
                if (r !== gap && r !== gap + 1) {
                    if (!grid[r][c].isStart && !grid[r][c].isEnd) {
                        grid[r][c].isWall = true;
                        document.getElementById(`node-${r}-${c}`).className = 'node wall';
                    }
                }
            }
        }
    }
}

function getNeighbors(node) {
    const neighbors = [];
    const { r, c } = node;
    // Top, Right, Bottom, Left order (visual appeal)
    if (r > 0) neighbors.push(grid[r - 1][c]);
    if (c < COLS - 1) neighbors.push(grid[r][c + 1]);
    if (r < ROWS - 1) neighbors.push(grid[r + 1][c]);
    if (c > 0) neighbors.push(grid[r][c - 1]);
    return neighbors.filter(n => !n.isWall);
}

function updateNodeClass(node, className) {
    if (node.isStart || node.isEnd) return;
    const el = document.getElementById(`node-${node.r}-${node.c}`);
    if (el) {
        el.className = `node ${className}`;
        if (node.weight > 1 && className !== 'wall') {
            el.classList.add('weight');
        }
    }
}

function heuristic(nodeA, nodeB) {
    return Math.abs(nodeA.r - nodeB.r) + Math.abs(nodeA.c - nodeB.c);
}

function getSpeed() {
    const val = parseInt(document.getElementById('speed').value);
    return 210 - val;
}

function softReset() {
    if (isRunning) return;
    clearTimeouts();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const node = grid[r][c];
            node.isVisited = false;
            node.previousNode = null;
            node.cost = Infinity;
            node.gCost = Infinity;
            node.fCost = Infinity;
            node.queuedForGreedy = false;
            node.isVisitedDLS = false;
            node.visitedDepth = Infinity;
            node.isVisitedForCount = false;

            if (!node.isWall && !node.isStart && !node.isEnd) {
                updateNodeClass(node, 'unvisited');
            }
        }
    }
    nodesVisitedCount = 0;
    pathLengthCount = 0;
    updateStats();
    setStatus('Idling');
}

async function runAlgorithm() {
    if (isRunning) return;

    softReset();

    isRunning = true;
    document.getElementById('run-btn').disabled = true;
    document.getElementById('maze').disabled = true;
    setStatus('Running...');

    const algo = document.getElementById('algorithm').value;
    const startObj = grid[startNode.r][startNode.c];
    const endObj = grid[endNode.r][endNode.c];
    let found = false;

    if (algo === 'bfs') found = await runBFS(startObj, endObj);
    else if (algo === 'dfs') found = await runDFS(startObj, endObj);
    else if (algo === 'dls') found = await runDLS(startObj, endObj);
    else if (algo === 'ucs') found = await runUCS(startObj, endObj);
    else if (algo === 'greedy') found = await runGreedy(startObj, endObj);
    else if (algo === 'astar') found = await runAStar(startObj, endObj);

    if (!isRunning) {
        // Was aborted
        document.getElementById('run-btn').disabled = false;
        document.getElementById('maze').disabled = false;
        return;
    }

    if (found) {
        setStatus('Drawing Path...');
        await drawPath(startObj, endObj);
        setStatus('Completed');
    } else {
        setStatus('No Path Found');
    }
    isRunning = false;
    document.getElementById('run-btn').disabled = false;
    document.getElementById('maze').disabled = false;
}

async function runBFS(startObj, endObj) {
    const queue = [startObj];
    startObj.isVisited = true;

    while (queue.length > 0 && isRunning) {
        const current = queue.shift();

        updateNodeClass(current, 'exploring');
        await sleep(getSpeed());
        if (!isRunning) break;

        if (current === endObj) return true;

        updateNodeClass(current, 'visited');
        if (current !== startObj) {
            nodesVisitedCount++;
            updateStats();
        }

        const neighbors = getNeighbors(current);
        for (let n of neighbors) {
            if (!n.isVisited) {
                n.isVisited = true;
                n.previousNode = current;
                queue.push(n);
                updateNodeClass(n, 'queued');
            }
        }
    }
    return false;
}

async function runDFS(startObj, endObj) {
    const stack = [startObj];

    while (stack.length > 0 && isRunning) {
        const current = stack.pop();

        if (current.isVisited) continue;
        current.isVisited = true;

        updateNodeClass(current, 'exploring');
        await sleep(getSpeed());
        if (!isRunning) break;

        if (current === endObj) return true;

        updateNodeClass(current, 'visited');
        if (current !== startObj) {
            nodesVisitedCount++;
            updateStats();
        }

        const neighbors = getNeighbors(current);
        // Reverse so visual exploration looks right (Top right down left visually)
        for (let n of neighbors.reverse()) {
            if (!n.isVisited) {
                // we set previousNode here, but it might be overwritten if pushed multiple times 
                // in standard DFS, this gives 'a' path, not necessarily shortest.
                n.previousNode = current;
                stack.push(n);
                updateNodeClass(n, 'queued');
            }
        }
    }
    return false;
}

async function runDLS(startObj, endObj) {
    const limit = 25;
    const stack = [{ node: startObj, depth: 0 }];

    while (stack.length > 0 && isRunning) {
        const { node: current, depth } = stack.pop();

        if (current.isVisitedDLS && current.visitedDepth <= depth) continue;
        current.isVisitedDLS = true;
        current.visitedDepth = depth;

        updateNodeClass(current, 'exploring');
        await sleep(getSpeed());
        if (!isRunning) break;

        if (current === endObj) return true;

        updateNodeClass(current, 'visited');

        if (current !== startObj && !current.isVisitedForCount) {
            current.isVisitedForCount = true;
            nodesVisitedCount++;
            updateStats();
        }

        if (depth < limit) {
            const neighbors = getNeighbors(current);
            for (let n of neighbors.reverse()) {
                n.previousNode = current;
                stack.push({ node: n, depth: depth + 1 });
                updateNodeClass(n, 'queued');
            }
        }
    }
    return false;
}

async function runUCS(startObj, endObj) {
    const pq = new SimplePQ();
    startObj.cost = 0;
    pq.enqueue(startObj, 0);

    while (!pq.isEmpty() && isRunning) {
        const current = pq.dequeue();

        if (current.isVisited) continue;
        current.isVisited = true;

        updateNodeClass(current, 'exploring');
        await sleep(getSpeed());
        if (!isRunning) break;

        if (current === endObj) return true;

        updateNodeClass(current, 'visited');
        if (current !== startObj) {
            nodesVisitedCount++;
            updateStats();
        }

        const neighbors = getNeighbors(current);
        for (let n of neighbors) {
            if (!n.isVisited) {
                const newCost = current.cost + n.weight;
                if (newCost < n.cost) {
                    n.cost = newCost;
                    n.previousNode = current;
                    pq.enqueue(n, newCost);
                    updateNodeClass(n, 'queued');
                }
            }
        }
    }
    return false;
}

async function runGreedy(startObj, endObj) {
    const pq = new SimplePQ();
    pq.enqueue(startObj, heuristic(startObj, endObj));

    while (!pq.isEmpty() && isRunning) {
        const current = pq.dequeue();

        if (current.isVisited) continue;
        current.isVisited = true;

        updateNodeClass(current, 'exploring');
        await sleep(getSpeed());
        if (!isRunning) break;

        if (current === endObj) return true;

        updateNodeClass(current, 'visited');
        if (current !== startObj) {
            nodesVisitedCount++;
            updateStats();
        }

        const neighbors = getNeighbors(current);
        for (let n of neighbors) {
            if (!n.isVisited) {
                if (!n.queuedForGreedy) {
                    n.queuedForGreedy = true;
                    n.previousNode = current;
                    pq.enqueue(n, heuristic(n, endObj));
                    updateNodeClass(n, 'queued');
                }
            }
        }
    }
    return false;
}

async function runAStar(startObj, endObj) {
    const pq = new SimplePQ();
    startObj.gCost = 0;
    startObj.fCost = heuristic(startObj, endObj);
    pq.enqueue(startObj, startObj.fCost);

    while (!pq.isEmpty() && isRunning) {
        const current = pq.dequeue();

        if (current.isVisited) continue;
        current.isVisited = true;

        updateNodeClass(current, 'exploring');
        await sleep(getSpeed());
        if (!isRunning) break;

        if (current === endObj) return true;

        updateNodeClass(current, 'visited');
        if (current !== startObj) {
            nodesVisitedCount++;
            updateStats();
        }

        const neighbors = getNeighbors(current);
        for (let n of neighbors) {
            if (!n.isVisited) {
                const tentative = current.gCost + n.weight;
                if (tentative < n.gCost) {
                    n.gCost = tentative;
                    n.fCost = n.gCost + heuristic(n, endObj);
                    n.previousNode = current;
                    pq.enqueue(n, n.fCost);
                    updateNodeClass(n, 'queued');
                }
            }
        }
    }
    return false;
}

async function drawPath(startObj, endObj) {
    let curr = endObj.previousNode;
    const path = [];
    while (curr && curr !== startObj) {
        path.push(curr);
        curr = curr.previousNode;
    }
    path.reverse();

    for (let p of path) {
        if (!isRunning) break;
        updateNodeClass(p, 'path');
        pathLengthCount++;
        updateStats();
        await sleep(30);
    }
}

function stopExecution() {
    isRunning = false;
    clearTimeouts();
    document.getElementById('run-btn').disabled = false;
    document.getElementById('maze').disabled = false;
}

window.onload = () => {
    // Intro Screen Logic
    const enterBtn = document.getElementById('enter-btn');
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            document.getElementById('intro-screen').classList.add('hidden');
        });
    }

    initializeGrid();

    document.getElementById('maze').addEventListener('change', generateMaze);
    document.getElementById('run-btn').addEventListener('click', () => {
        if (isRunning) return;
        runAlgorithm();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        stopExecution();
        softReset();
    });

    // Changing the algorithm during idling could do a soft reset
    document.getElementById('algorithm').addEventListener('change', () => {
        if (!isRunning) softReset();
    });
};
