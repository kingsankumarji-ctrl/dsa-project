import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowRight, Atom, BookOpen, Check, ChevronDown, CircleHelp, Copy, Eye, EyeOff,
  Github, Lightbulb, Menu, Pause, Play, RotateCcw, Sparkles, X,
} from 'lucide-react';
import {
  evaluatePolynomial, formatPolynomial, getOperationSteps, operate, parsePolynomial,
  polynomialDegree, type Operation, type Polynomial,
} from './math/polynomial';

const HeroScene = lazy(() => import('./components/HeroScene'));
const CursorNumberField = lazy(() => import('./components/CursorNumberField'));
const EXAMPLE_A = '3x² + 2x + 5';
const EXAMPLE_B = 'x² - 4x + 7';

function usePolynomial(source: string) {
  return useMemo(() => {
    try {
      return { polynomial: parsePolynomial(source), error: '' };
    } catch (error) {
      return { polynomial: new Map<number, number>(), error: error instanceof Error ? error.message : 'Invalid polynomial.' };
    }
  }, [source]);
}

function Graph({ a, b, result, xRange, xCenter }: { a: Polynomial; b: Polynomial; result: Polynomial; xRange: number; xCenter: number }) {
  const [visible, setVisible] = useState({ a: true, b: true, result: true });
  const [hover, setHover] = useState<{ x: number; y: number; svgX: number; svgY: number } | null>(null);
  const width = 760;
  const height = 330;
  const pad = { left: 54, right: 20, top: 18, bottom: 36 };
  const graphWidth = width - pad.left - pad.right;
  const graphHeight = height - pad.top - pad.bottom;
  const mapX = (x: number) => pad.left + ((x - xCenter + xRange) / (2 * xRange)) * graphWidth;
  const yLimit = useMemo(() => {
    let max = 4;
    for (let index = 0; index <= 40; index += 1) {
      const x = xCenter - xRange + index * (xRange / 20);
      max = Math.max(max, Math.abs(evaluatePolynomial(a, x)), Math.abs(evaluatePolynomial(b, x)), Math.abs(evaluatePolynomial(result, x)));
    }
    return Math.min(80, Math.max(4, max * 1.16));
  }, [a, b, result, xRange, xCenter]);
  const mapY = (y: number) => pad.top + graphHeight / 2 - (y / (2 * yLimit)) * graphHeight;
  const path = (polynomial: Polynomial) => {
    const points: string[] = [];
    for (let index = 0; index <= 140; index += 1) {
      const x = xCenter - xRange + index * (2 * xRange / 140);
      const y = Math.max(-yLimit * 1.3, Math.min(yLimit * 1.3, evaluatePolynomial(polynomial, x)));
      points.push(`${index === 0 ? 'M' : 'L'}${mapX(x).toFixed(1)},${mapY(y).toFixed(1)}`);
    }
    return points.join(' ');
  };
  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
    const x = Math.max(xCenter - xRange, Math.min(xCenter + xRange, ((svgX - pad.left) / graphWidth) * 2 * xRange + xCenter - xRange));
    const y = evaluatePolynomial(result, x);
    setHover({ x, y, svgX, svgY: mapY(y) });
  };
  return (
    <div className="graph-shell">
      <div className="graph-toolbar">
        <div className="curve-toggles">
          {([['a', 'A(x)', 'cyan'], ['b', 'B(x)', 'violet'], ['result', 'Result', 'pink']] as const).map(([key, label, color]) =>
            <button className={`curve-toggle ${color} ${visible[key] ? 'enabled' : ''}`} key={key} onClick={() => setVisible(current => ({ ...current, [key]: !current[key] }))}>
              <span className="curve-dot" />{label}
            </button>,
          )}
        </div>
        <div className="range-control">x-range <span>±{xRange}</span></div>
      </div>
      <svg className="graph-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Interactive graph of polynomial A, polynomial B, and the selected result" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 9 }, (_, index) => {
          const x = pad.left + index * graphWidth / 8;
          const y = pad.top + index * graphHeight / 8;
          return <g key={index}><line x1={x} x2={x} y1={pad.top} y2={height - pad.bottom} className="grid-line" /><line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="grid-line" /></g>;
        })}
        <line x1={pad.left} x2={width - pad.right} y1={mapY(0)} y2={mapY(0)} className="axis-line" />
        <line x1={mapX(0)} x2={mapX(0)} y1={pad.top} y2={height - pad.bottom} className="axis-line" />
        <text x={width - pad.right - 5} y={mapY(0) - 8} className="axis-label">x</text>
        <text x={mapX(0) + 8} y={pad.top + 12} className="axis-label">y</text>
        {visible.a && <path d={path(a)} className="plot plot-a" />}
        {visible.b && <path d={path(b)} className="plot plot-b" />}
        {visible.result && <path d={path(result)} className="plot plot-result" />}
        {hover && <g><line x1={hover.svgX} x2={hover.svgX} y1={pad.top} y2={height - pad.bottom} className="hover-line" /><circle cx={hover.svgX} cy={hover.svgY} r="5" className="hover-point" /></g>}
      </svg>
      {hover && <div className="graph-tooltip">x = {hover.x.toFixed(2)}<br />Result = {hover.y.toFixed(2)}</div>}
      <p className="graph-caption">Polynomial multiplication combines terms and exponents; it does not add graph heights.</p>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState('home');
  const [aText, setAText] = useState(EXAMPLE_A);
  const [bText, setBText] = useState(EXAMPLE_B);
  const [operation, setOperation] = useState<Operation>('add');
  const [showSteps, setShowSteps] = useState(true);
  const [copied, setCopied] = useState(false);
  const [xRange, setXRange] = useState(5);
  const [xCenter, setXCenter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [difficulty, setDifficulty] = useState('Easy');
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [challenge, setChallenge] = useState({ a: '2x + 3', b: 'x - 1', operation: 'add' as Operation });
  const a = usePolynomial(aText);
  const b = usePolynomial(bText);
  const result = useMemo(() => !a.error && !b.error ? operate(a.polynomial, b.polynomial, operation) : new Map<number, number>(), [a, b, operation]);
  const resultText = formatPolynomial(result);
  const steps = useMemo(() => !a.error && !b.error ? getOperationSteps(a.polynomial, b.polynomial, operation) : [], [a, b, operation]);
  const operationLabels: Record<Operation, string> = { add: 'Addition', subtract: 'Subtraction', multiply: 'Multiplication' };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setXRange(range => range >= 10 ? 2 : range + 1), 1200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const selectOperation = (next: Operation) => setOperation(next);
  const openPage = (id: string) => {
    setActivePage(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const scrollTo = openPage;
  const loadExample = () => { setAText(EXAMPLE_A); setBText(EXAMPLE_B); setOperation('add'); };
  const clearInputs = () => { setAText(''); setBText(''); };
  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const newChallenge = (selectedDifficulty = difficulty) => {
    const configs = {
      Easy: { maxPower: 1, maxCoefficient: 5 },
      Medium: { maxPower: 2, maxCoefficient: 7 },
      Advanced: { maxPower: 3, maxCoefficient: 9 },
    };
    const config = configs[selectedDifficulty as keyof typeof configs];
    const power = Math.floor(Math.random() * (config.maxPower + 1));
    const first = Math.floor(Math.random() * config.maxCoefficient) + 1;
    const second = Math.floor(Math.random() * config.maxCoefficient) + 1;
    const xTerm = (coefficient: number, exponent: number) => `${coefficient === 1 ? '' : coefficient}${exponent === 0 ? '' : `x${exponent > 1 ? `^${exponent}` : ''}`}` || String(coefficient);
    const op = (['add', 'subtract', 'multiply'] as Operation[])[Math.floor(Math.random() * 3)];
    const firstExp = selectedDifficulty === 'Easy' ? 1 : power;
    const secondExp = selectedDifficulty === 'Easy' ? 1 : Math.max(0, power - 1);
    setChallenge({ a: `${xTerm(first, firstExp)} + ${Math.floor(Math.random() * 5)}`, b: `${xTerm(second, secondExp)} - 1`, operation: op });
    setAnswer('');
    setFeedback('');
    setHintVisible(false);
  };
  const checkAnswer = () => {
    try {
      const expected = formatPolynomial(operate(parsePolynomial(challenge.a), parsePolynomial(challenge.b), challenge.operation));
      const submitted = formatPolynomial(parsePolynomial(answer));
      if (submitted === expected) {
        setScore(current => current + 1);
        setFeedback('That’s right — beautifully combined! Keep your streak going.');
      } else setFeedback(`Not quite yet. Your simplified answer should be ${expected}. Try grouping terms with matching powers.`);
    } catch {
      setFeedback('Enter a valid polynomial expression first, then give it another try.');
    }
  };
  const challengeResult = formatPolynomial(operate(parsePolynomial(challenge.a), parsePolynomial(challenge.b), challenge.operation));

  return (
    <>
      {activePage !== 'home' && <Suspense fallback={null}><CursorNumberField /></Suspense>}
      <header className="nav">
        <button className="brand" onClick={() => scrollTo('home')} aria-label="POLYNOVA home"><span className="brand-mark"><Atom size={22} /></span>POLY<span>NOVA</span></button>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
          {[['Home', 'home'], ['Calculator', 'calculator'], ['Visualize', 'visualize'], ['Learn', 'learn'], ['Practice', 'practice'], ['About', 'about']].map(([label, id]) =>
            <button key={id} className={activePage === id ? 'active' : ''} aria-current={activePage === id ? 'page' : undefined} onClick={() => openPage(id)}>{label}</button>,
          )}
          <button className="nav-cta" onClick={() => scrollTo('calculator')}>Open lab <ArrowRight size={15} /></button>
        </nav>
        <button className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <main className={`page-shell page-${activePage}`} key={activePage}>
        {activePage === 'home' && <>
        <section className="hero" id="home">
          <div className="hero-grid" />
          <Suspense fallback={null}><CursorNumberField className="cursor-number-field hero-number-field" /></Suspense>
          <Suspense fallback={<div className="hero-scene" aria-hidden="true" />}><HeroScene /></Suspense>
          <div className="hero-content">
            <div className="eyebrow"><span className="live-dot" /> YOUR NEXT MATHEMATICAL DIMENSION</div>
            <h1>POLY<span>NOVA</span></h1>
            <p className="hero-tagline">Mathematics Beyond<br className="desktop-break" /> the Ordinary.</p>
            <p className="hero-description">Transform polynomial equations into interactive mathematical experiences. Calculate, visualize, and understand every operation in real time.</p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => scrollTo('calculator')}>Start calculating <ArrowRight size={17} /></button>
              <button className="button ghost" onClick={() => scrollTo('visualize')}><span className="play-icon"><Play size={13} fill="currentColor" /></span> Explore 3D math</button>
            </div>
            <div className="hero-proof"><div className="avatar-stack"><span>∑</span><span>π</span><span>∞</span></div><span>Math, made <strong>beautifully clear.</strong></span></div>
          </div>
          <div className="hero-floating eq-one">x<sup>2</sup> + y<sup>2</sup></div>
          <div className="hero-floating eq-two">∫ f(x) dx</div>
          <div className="hero-floating eq-three">a<sub>n</sub>x<sup>n</sup></div>
          <button className="scroll-cue" onClick={() => scrollTo('calculator')}><span>SCROLL TO EXPLORE</span><ArrowDown size={15} /></button>
          <div className="hero-index">01 <span>/</span> 06</div>
        </section>
        </>}

        {activePage === 'calculator' &&
        <section className="section calculator-section" id="calculator">
          <div className="section-heading">
            <div><span className="section-kicker">THE POLYNOMIAL LAB <i>01</i></span><h2>Let’s solve <em>something.</em></h2><p>Enter two polynomials. Pick an operation. See the mathematics unfold.</p></div>
            <div className="heading-decoration">∑<span>∞</span></div>
          </div>
          <div className="calculator-layout">
            <div className="input-card glass-card">
              <div className="card-topline"><span>EXPRESSION EDITOR</span><span className="secure-label"><Sparkles size={13} /> REAL-TIME ENGINE</span></div>
              <label className="polynomial-input-label" htmlFor="poly-a"><span className="term-badge a-badge">A</span><span>Polynomial A</span><small>Use x^2 or x²</small></label>
              <input id="poly-a" className={a.error ? 'poly-input invalid' : 'poly-input'} value={aText} onChange={event => setAText(event.target.value)} placeholder="e.g. 3x² + 2x + 5" autoComplete="off" spellCheck={false} />
              {a.error && <p className="input-error" role="alert">{a.error}</p>}
              <label className="polynomial-input-label second-label" htmlFor="poly-b"><span className="term-badge b-badge">B</span><span>Polynomial B</span><small>Integer, decimal, fraction</small></label>
              <input id="poly-b" className={b.error ? 'poly-input invalid' : 'poly-input'} value={bText} onChange={event => setBText(event.target.value)} placeholder="e.g. x² - 4x + 7" autoComplete="off" spellCheck={false} />
              {b.error && <p className="input-error" role="alert">{b.error}</p>}
              <div className="input-actions"><button onClick={loadExample}><Sparkles size={14} /> Load example</button><button onClick={clearInputs}>Clear inputs</button></div>
              <div className="input-tip"><Lightbulb size={15} /><span>Tip: write <code>2x^3</code>, <code>1/2x</code>, or group expressions like <code>(x + 2)(x - 1)</code>.</span></div>
            </div>
            <div className="operation-panel">
              <div className="operation-label">CHOOSE YOUR OPERATION</div>
              <div className="operation-grid">
                {([
                  ['add', '+', 'Addition', 'Combine like terms'],
                  ['subtract', '−', 'Subtraction', 'Find the difference'],
                  ['multiply', '×', 'Multiplication', 'Expand the product'],
                ] as [Operation, string, string, string][]).map(([key, symbol, label, description]) =>
                  <button key={key} className={`operation-card ${operation === key ? 'selected' : ''}`} onClick={() => selectOperation(key)} aria-pressed={operation === key}>
                    <span className="operation-symbol">{symbol}</span><span className="operation-name">{label}</span><span className="operation-description">{description}</span>
                    {operation === key && <span className="selected-indicator"><Check size={13} /></span>}
                  </button>,
                )}
              </div>
              <div className="result-card glass-card">
                <div className="result-head"><span>YOUR RESULT</span><button onClick={copyResult} disabled={!!a.error || !!b.error} aria-label="Copy result">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy'}</button></div>
                <div className="result-equation"><span className="result-a">A(x)</span><span>{operation === 'add' ? '+' : operation === 'subtract' ? '−' : '×'}</span><span className="result-b">B(x)</span><span>=</span><strong>{a.error || b.error ? '—' : resultText}</strong></div>
                <div className="result-summary"><span className="result-spark">✦</span> {a.error || b.error ? 'Fix the expression above to continue' : `A ${operationLabels[operation].toLowerCase()} result, simplified.`}</div>
              </div>
            </div>
          </div>
          <div className="steps-card glass-card">
            <div className="steps-header"><div><span className="section-kicker">THE REASONING</span><h3>Every step, <em>explained.</em></h3></div><button className="text-button" onClick={() => setShowSteps(value => !value)}>{showSteps ? <EyeOff size={15} /> : <Eye size={15} />}{showSteps ? 'Hide steps' : 'Show steps'}<ChevronDown className={showSteps ? 'chevron open' : 'chevron'} size={14} /></button></div>
            {showSteps && <div className="step-list">
              {steps.map((step, index) => <div className="step-row" key={`${operation}-${index}`}><span className="step-number">{String(index + 1).padStart(2, '0')}</span><div><span className="step-title">{index === steps.length - 1 ? 'THE ANSWER' : ['SET THE SCENE', operation === 'multiply' ? 'DISTRIBUTE' : operation === 'subtract' ? 'FLIP THE SIGNS' : 'GROUP LIKE TERMS', 'COMBINE & SIMPLIFY'][Math.min(index, 2)]}</span><p>{step}</p></div>{index === steps.length - 1 && <Sparkles className="step-sparkle" size={17} />}</div>)}
            </div>}
          </div>
        </section>
        }

        {activePage === 'visualize' &&
        <section className="section visualize-section" id="visualize">
          <div className="section-heading">
            <div><span className="section-kicker">THE VISUALIZATION LAB <i>02</i></span><h2>See the shape of <em>math.</em></h2><p>Expressions become curves. Change the operation and watch the result transform.</p></div>
            <div className="viz-controls"><button className="icon-control" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause simulation' : 'Play simulation'}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><button className="icon-control" onClick={() => { setPlaying(false); setXRange(5); setXCenter(0); }} aria-label="Reset simulation"><RotateCcw size={17} /></button><span>{playing ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}</span></div>
          </div>
          <div className="visualizer-card glass-card">
            <div className="viz-intro"><div><span className="viz-mini-label"><span className="live-dot" /> LIVE FUNCTION PLOT</span><h3>Three expressions.<br /><em>One coordinate plane.</em></h3></div><div className="viz-expression"><span>{operationLabels[operation].toUpperCase()}</span><strong>{resultText}</strong><small>f(x) = {resultText}</small></div></div>
            <Graph a={a.polynomial} b={b.polynomial} result={result} xRange={xRange} xCenter={xCenter} />
            <div className="graph-controls">
              <label className="range-slider"><span>ZOOM <small>±{xRange}</small></span><input aria-label="Adjust graph zoom" type="range" min="2" max="10" value={xRange} onChange={event => setXRange(Number(event.target.value))} /></label>
              <label className="range-slider"><span>PAN <small>{xCenter > 0 ? '+' : ''}{xCenter}</small></span><input aria-label="Pan graph horizontally" type="range" min="-10" max="10" value={xCenter} onChange={event => setXCenter(Number(event.target.value))} /></label>
            </div>
            <div className="viz-footnote"><CircleHelp size={14} /><span>Each curve shows its own function value. The result curve is calculated by polynomial algebra—not by adding or subtracting graph heights.</span></div>
          </div>
        </section>
        }

        {activePage === 'learn' && <>
        <section className="section dashboard-section" id="learn">
          <div className="section-heading compact-heading">
            <div><span className="section-kicker">YOUR MATH DASHBOARD <i>03</i></span><h2>A little more <em>insight.</em></h2></div>
            <p>Small details. Big understanding.</p>
          </div>
          <div className="dashboard-grid">
            <div className="stat-card"><span className="stat-icon cyan">∑</span><span className="stat-label">RESULT DEGREE</span><strong>{result.size ? polynomialDegree(result) : '—'}</strong><small>Highest power of x</small></div>
            <div className="stat-card"><span className="stat-icon violet">⌗</span><span className="stat-label">NON-ZERO TERMS</span><strong>{result.size}</strong><small>After simplification</small></div>
            <div className="stat-card wide-stat"><span className="stat-label">COEFFICIENT BREAKDOWN</span><div className="coefficient-chips">{[...result].sort(([p], [q]) => q - p).map(([power, coefficient]) => <span key={power}><strong>{coefficient}</strong><small>{power === 0 ? 'constant' : `x${power > 1 ? `^${power}` : ''}`}</small></span>)}{result.size === 0 && <span><strong>0</strong><small>zero polynomial</small></span>}</div></div>
          </div>
        </section>

        <section className="learn-band">
          <div className="learn-band-inner"><span className="learn-icon"><BookOpen size={21} /></span><div><span className="section-kicker">THE QUICK GUIDE</span><h3>Three rules. <em>Infinite possibilities.</em></h3><p><strong>Add & subtract:</strong> only combine coefficients of matching powers. <strong>Multiply:</strong> multiply coefficients, then add exponents. <code>x<sup>m</sup> · x<sup>n</sup> = x<sup>m+n</sup></code></p></div><span className="learn-equation">x<sup>m</sup> · x<sup>n</sup><br /><i>= x<sup>m+n</sup></i></span></div>
        </section>
        </>}

        {activePage === 'practice' &&
        <section className="section practice-section" id="practice">
          <div className="section-heading">
            <div><span className="section-kicker">YOUR TURN <i>04</i></span><h2>Challenge <em>yourself.</em></h2><p>Practice makes patterns. Patterns make progress.</p></div>
            <div className="score-display"><span>YOUR SCORE</span><strong>{String(score).padStart(2, '0')} <small>pts</small></strong></div>
          </div>
          <div className="practice-card glass-card">
            <div className="practice-top"><div><span className="section-kicker">QUESTION 01 <i>·</i> {difficulty.toUpperCase()}</span><h3>Simplify this expression.</h3></div><div className="difficulty-tabs">{['Easy', 'Medium', 'Advanced'].map(level => <button key={level} className={difficulty === level ? 'active' : ''} onClick={() => { setDifficulty(level); newChallenge(level); }}>{level}</button>)}</div></div>
            <div className="challenge-equation"><span>({challenge.a})</span><b>{challenge.operation === 'add' ? '+' : challenge.operation === 'subtract' ? '−' : '×'}</b><span>({challenge.b})</span></div>
            <label className="answer-label" htmlFor="practice-answer">YOUR ANSWER</label><div className="answer-row"><input id="practice-answer" value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') checkAnswer(); }} placeholder="Type your simplified polynomial…" /><button className="button primary" onClick={checkAnswer}>Check answer <ArrowRight size={16} /></button></div>
            {feedback && <div className={`feedback ${feedback.startsWith('That') ? 'correct' : 'incorrect'}`} role="status">{feedback}</div>}
            {hintVisible && <div className="hint-box"><Lightbulb size={16} /> {challenge.operation === 'multiply' ? 'Distribute every term pair. For each pair, multiply the coefficients and add the exponents.' : 'Line up terms with the same power of x, then combine their coefficients.'} {feedback && !feedback.startsWith('That') && <span> Solution: {challengeResult}</span>}</div>}
            <div className="practice-footer"><button className="text-button" onClick={() => setHintVisible(value => !value)}><Lightbulb size={15} />{hintVisible ? 'Hide hint' : 'Need a hint?'}</button><button className="new-question" onClick={() => newChallenge()}><RotateCcw size={15} /> New question</button></div>
          </div>
          <div className="progress-track"><div style={{ width: `${Math.min(score * 10, 100)}%` }} /><span>{score % 10} / 10 questions to your next milestone</span></div>
        </section>
        }

        {activePage === 'about' &&
        <section className="about-section" id="about">
          <div className="about-orbit"><span>∑</span><i>π</i><b>∞</b><div /></div>
          <div className="about-copy"><span className="section-kicker">A NEW WAY TO SEE IT <i>05</i></span><h2>Made for the<br /><em>“oh, I get it”</em><br />moment.</h2><p>POLYNOVA brings algebra out of the textbook and into a space you can explore. A real symbolic engine, interactive graphs, and clear worked steps help turn abstract expressions into things you can see, play with, and understand.</p><button className="button ghost" onClick={() => scrollTo('calculator')}>Back to the lab <ArrowRight size={16} /></button></div>
        </section>
        }
      </main>
      <footer className="footer"><button className="brand" onClick={() => scrollTo('home')}><span className="brand-mark"><Atom size={20} /></span>POLY<span>NOVA</span></button><span>Algebra, with a little more wonder. <b>© 2026 POLYNOVA</b></span><button className="footer-link" onClick={() => scrollTo('learn')}><Github size={16} /> BUILT FOR CURIOUS MINDS</button></footer>
    </>
  );
}

export default App;
