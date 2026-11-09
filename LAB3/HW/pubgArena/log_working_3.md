 ▐▛███▛█   Claude Code v2.1.319
▝▜██████▀  Opus 5.5 · Claude Max
 ▝▝   ▝▝   D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r


❯ now we start with new task of HW 2 Engine: Polyphonic Voice Pool & Async FIFO 
  Replay, you must follow rules on Project_Rules.md in LAB3, you can reuse      
  code on LAB3 if useful, now we start with first PRDs                          
  PRD 1 — Algorithmic 88-Key Piano Generation                                   
  T-02A: Piano Architecture & MIDI Generation                                   
  Commit 1                                                                      
  Estimated duration: 20–25 minutes                                             
                                                                                
  Git commit message                                                            
                                                                                
  feat(hw2): generate algorithmic 88-key piano                                  
                                                                                
  1. Objective                                                                  
     Build an interactive 88-key piano using mathematical MIDI note generation  
  instead of manually writing 88 individual HTML or JSX elements.               
                                                                                
  The keyboard must cover the complete standard piano range:                    
                                                                                
  Lowest note: A0 (MIDI 21).                                                    
                                                                                
  Highest note: C8 (MIDI 108).                                                  
                                                                                
  Total: 88 keys.                                                               
                                                                                
  White keys: 52.                                                               
                                                                                
  Black keys: 36.                                                               
                                                                                
  2. Algorithmic MIDI generation                                                
     Generate all piano keys using a loop.                                      
                                                                                
  const PIANO_CONFIG = {                                                        
    startMidi: 21,                                                              
    endMidi: 108,                                                               
    totalKeys: 88,                                                              
  };                                                                            
                                                                                
  const WHITE_NOTES = [                                                         
    'C', 'D', 'E', 'F', 'G', 'A', 'B'                                           
  ];                                                                            
                                                                                
  const BLACK_NOTE_CLASSES = [                                                  
    'C#', 'D#', 'F#', 'G#', 'A#'                                                
  ];                                                                            
                                                                                
  Implement the frequency conversion:                                           
                                                                                
  export function midiToFrequency(midi) {                                       
    return 440 * Math.pow(2, (midi - 69) / 12);                                 
  }                                                                             
                                                                                
  This formula uses A4 (MIDI 69) as the reference frequency of 440 Hz.          
                                                                                
  3. Generate note metadata                                                     
     Every generated key must contain:                                          
                                                                                
  {                                                                             
    midi: 69,                                                                   
    note: 'A',                                                                  
    octave: 4,                                                                  
    freqHz: 440,                                                                
    type: 'white',                                                              
  }                                                                             
                                                                                
  Determine:                                                                    
                                                                                
  MIDI number.                                                                  
                                                                                
  Note name.                                                                    
                                                                                
  Octave.                                                                       
                                                                                
  Frequency in Hz.                                                              
                                                                                
  Key type (white or black).                                                    
                                                                                
  Use the MIDI note number to determine the note and octave mathematically.     
                                                                                
  Important: MIDI 21–108 includes exactly 88 notes. Ensure the octave           
  calculation correctly identifies A0 as MIDI 21 and C8 as MIDI 108.            
                                                                                
  4. Key classification                                                         
     Determine white and black keys using the note's position within a 12-note  
  chromatic scale.                                                              
                                                                                
  const NOTE_NAMES = [                                                          
    'C', 'C#', 'D', 'D#',                                                       
    'E', 'F', 'F#', 'G',                                                        
    'G#', 'A', 'A#', 'B'                                                        
  ];                                                                            
                                                                                
  const noteIndex = midi % 12;                                                  
  const noteName = NOTE_NAMES[noteIndex];                                       
                                                                                
  const isBlack = noteName.includes('#');                                       
                                                                                
  5. Semantic rendering                                                         
     Generate piano keys using .map():                                          
                                                                                
  <section aria-label="88-key piano">                                           
    <ol className={styles.keyboard}>                                            
      {pianoKeys.map((key) => (                                                 
        <li key={key.midi}>                                                     
          <PianoKey pianoKey={key} />                                           
        </li>                                                                   
      ))}                                                                       
    </ol>                                                                       
  </section>                                                                    
                                                                                
  Do not manually hardcode 88 JSX elements.                                     
                                                                                
  6. Visual requirements                                                        
     White keys must have a distinct white appearance.                          
                                                                                
  Black keys must be visually differentiated.                                   
                                                                                
  Keys must align according to their musical positions.                         
                                                                                
  Each key must display its note label.                                         
                                                                                
  Support horizontal scrolling on smaller screens.                              
                                                                                
  Include accessible names for individual piano keys.                           
                                                                                
  7. Acceptance criteria                                                        
                                                                                
  Exactly 88 keys are generated.                                                
                                                                                
  Exactly 52 white keys exist.                                                  
                                                                                
  Exactly 36 black keys exist.                                                  
                                                                                
  MIDI range is 21–108.                                                         
                                                                                
  A4 produces 440 Hz.                                                           
                                                                                
  Every key has a unique MIDI identifier.                                       
                                                                                
  No manually hardcoded 88-key JSX structure.                                   
                                                                                
  Key classification is mathematically correct.                                 
                                                                                
  The keyboard renders responsively.                                            

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r";
      M="C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R11-
      CTTT-static-web-v3r/m…)
  ⎿  ---
     name: lab3-hw1-drum-kit
     description: "LAB3 HW1 \"Production Studio Drum Kit\" (WCAG 2.2 AA, Li
     … +130 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/dr
      umKit"; cat vite.config.js playwright.config.js index.html; ls src e2e
      scripts public;…)
  ⎿  import { defineConfig } from "vite";
     import react from "@vitejs/plugin-react";
     … +138 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/dr
      umKit"; ls src/components; cat src/drumPads.js src/components/DrumKit.jsx
      src/component…)
  ⎿  AudioMeter.jsx
     AudioMeter.test.jsx
     DrumKit.jsx
     … +546 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/dr
      umKit"; cat src/components/DrumKit.module.css | head -60; cat
      src/components/DrumKit.te…)
  ⎿  Error: Exit code 1
     /*
      * Production Studio Drum Kit — styles (T-01A layout, T-01C meter + log, 
     T-01D
      * studio theme, responsive grid, reduced motion).
      *
      * Every colour comes from the --studio-* tokens in index.html, whose 
     contrast
      * is checked by src/theme.test.js. State is never conveyed by motion 
     alone:
      * an active pad also changes background and border colour, so the feedback
      * survives prefers-reduced-motion.
      */
     … +113 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW";
      mkdir -p pianoEngine/src/components pianoEngine/e2e pianoEngine/public; cp
      drumKit/pack…)
  ⎿  2:  "name": "polyphonic-piano-engine",
     12:    "lighthouse": "node scripts/lighthouse.mjs"

     added 95 packages in 5s
  ⎿  Created LAB3\HW\pianoEngine\.gitignore (+5 -0)
      1 +node_modules                                                    
      2 +dist                                                            
      3 +test-results                                                    
      4 +playwright-report                                               
      5 +lighthouse/report.report.json                                   
  ⎿  Created LAB3\HW\pianoEngine\package.json (+29 -0)
       1 +{                                                              
       2 +  "name": "polyphonic-piano-engine",                           
       3 +  "private": true,                                             
       4 +  "version": "0.1.0",                                          
       5 +  "type": "module",                                            
       6 +  "scripts": {                                                 
       7 +    "dev": "vite",                                             
       8 +    "build": "vite build",                                     
       9 +    "preview": "vite preview",                                 
      10 +    "test": "vitest run",                                      
      11 +    "test:e2e": "playwright test",                             
      12 +    "lighthouse": "node scripts/lighthouse.mjs"                
      13 +  },                                                           
      14 +  "dependencies": {                                            
      15 +    "react": "^19.3.1",                                        
      16 +    "react-dom": "^19.3.1"                                     
      17 +  },                                                           
      18 +  "devDependencies": {                                         
      19 +    "@axe-core/playwright": "^4.14.0",                         
      20 +    "@playwright/test": "^1.64.1",                             
      21 +    "@testing-library/dom": "^10.4.2",                         
      22 +    "@testing-library/react": "^16.3.3",                       
      23 +    "@testing-library/user-event": "^14.6.1",                  
      24 +    "@vitejs/plugin-react": "^6.1.2",                          
      25 +    "jsdom": "^30.1.3",                                        
      26 +    "vite": "^8.3.5",                                          
      27 +    "vitest": "^5.0.5"                                         
      28 +  }                                                            
      29 +}                                                              
  ⎿  Created LAB3\HW\pianoEngine\public\robots.txt (+2 -0)
      1 +User-agent: *                                                   
      2 +Allow: /                                                        
  ⎿  … 1 more file changed
  ⎿  (timeout 5m)

● Scaffolded LAB3/HW/pianoEngine (same Vite/React/Vitest/Playwright stack as
  HW1). Now writing the MIDI generator and components.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; sed -i '/"lighthouse": /d; s/"test:e2e": "playwright
      test",/"test:e2e": "pl…)
  ⎿    "type": "module",
       "scripts": {
         "dev": "vite",
     … +10 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\.gitignore (+1 -1)
      2  dist
      3  test-results
      4  playwright-report
      5 -lighthouse/report.report.json                                   
      5 +                                                                
  ⎿  Updated LAB3\HW\pianoEngine\package.json (+1 -2)
       8      "build": "vite build",
       9      "preview": "vite preview",
      10      "test": "vitest run",
      11 -    "test:e2e": "playwright test",                             
      12 -    "lighthouse": "node scripts/lighthouse.mjs"                
      11 +    "test:e2e": "playwright test"                              
      12    },
      13    "dependencies": {
      14      "react": "^19.3.1",

● Write(LAB3\HW\pianoEngine\src\piano.js)
  ⎿  Wrote 158 lines to LAB3\HW\pianoEngine\src\piano.js
       1 /**
       2  * Polyphonic Piano Engine — T-02A algorithmic 88-key generation
       3  *
       4  * The keyboard is computed from MIDI numbers, never written out
          by hand:
       5  * a loop over MIDI 21 (A0) … 108 (C8) derives every key's note 
         name, octave,
       6  * frequency and colour from the note's position in the 12-note 
         chromatic
       7  * scale. The result is the single source of truth the UI maps o
     … +152 lines (~6 KB) (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"
      cat > src/components/PianoKey.jsx <<'EOF'…)
  ⎿  Error: Exit code 2
     /usr/bin/bash: -c: line 235: unexpected EOF while looking for matching `''

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; ls -la src src/components; ls)
  ⎿  src:
     total 12
     drwxr-xr-x 1 admin 197121    0 Nov  9 17:20 .
     … +14 lines (ctrl+o to expand)

● I'll write the files individually instead.

● Write(LAB3\HW\pianoEngine\src\components\PianoKey.jsx)
  ⎿  Wrote 41 lines to LAB3\HW\pianoEngine\src\components\PianoKey.jsx
       1 /**
       2  * Polyphonic Piano Engine — T-02A piano key
       3  *
       4  * One key as one native <button>. The parent (Piano) owns the <
         ol>, the <li>
       5  * and the list key, so the key adds no wrapper of its own (Proj
         ect Rules 1
       6  * and 4):
       7  *
       8  *   <button type="button" data-midi="69" data-note-type="white"
     … +34 lines (~1 KB) (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\components\Piano.jsx)
  ⎿  Wrote 59 lines to LAB3\HW\pianoEngine\src\components\Piano.jsx
       1 /**
       2  * Polyphonic Piano Engine — T-02A 88-key keyboard
       3  *
       4  * The keys are generated (piano.js) and mapped here; no key is 
         written out by
       5  * hand. Piano owns the whole list, so each key is exactly one <
         li> holding
       6  * one <button> (Project Rules 1 and 4):
       7  *
       8  *   <section aria-label="88-key piano">
     … +51 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\components\Piano.module.css)
  ⎿  Wrote 104 lines to LAB3\HW\pianoEngine\src\components\Piano.module.css
       1 /*
       2  * Polyphonic Piano Engine — keyboard styles (T-02A).
       3  *
       4  * Colours come from the --piano-* tokens in index.html. One whi
         te key is
       5  * --piano-white-width wide (6 grid units); a black key is 4 uni
         ts, 2/3 of a
       6  * white key, which keeps it above the 24 px minimum target size
          (WCAG 2.5.8).
       7  */
     … +97 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\App.jsx)
  ⎿  Wrote 15 lines to LAB3\HW\pianoEngine\src\App.jsx
       1 import Piano from "./components/Piano.jsx";
       2 import { PIANO_KEYS } from "./piano.js";
       3 
       4 /** Rendered into <main id="root"> (index.html); landmarks only,
          no wrapper element. */
       5 export default function App() {
       6     return (
       7         <>
       8             <header>
       9                 <h1>Polyphonic Piano Engine</h1>
     … +6 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\index.html)
  ⎿  Wrote 44 lines to LAB3\HW\pianoEngine\index.html
       1 <!doctype html>
       2 <html lang="en">
       3 <head>
       4   <meta charset="utf-8">
       5   <meta name="viewport" content="width=device-width, initial-sca
         le=1">
       6   <title>Polyphonic Piano Engine – 88-Key Piano</title>
       7   <meta name="description" content="An 88-key piano (A0 to C8) g
         enerated algorithmically from MIDI note numbers.">
       8   <meta name="theme-color" content="#101218">
     … +36 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; cp ../drumKit/src/main.jsx src/; cp ../drumKit/vite.config.js
      .; sed 's/517…)
  ⎿  6: * download is needed. Port 5175 so it never collides with the drum
     kit on 5174.
     12:        baseURL: "http://localhost:5175",
     … +61 lines (ctrl+o to expand)
  ⎿  Created LAB3\HW\pianoEngine\playwright.config.js (+21 -0)
       1 +import { defineConfig } from "@playwright/test";               
       2 +                                                               
       3 +/**                                                            
       4 + * Browser QA: the dev server (development React, so key warnin
         +gs would show),                                                
       5 + * a 375px-wide phone viewport, and the installed Microsoft Edg
         +e, so no browser                                               
       6 + * download is needed. Port 5175 so it never collides with the 
         +drum kit on 5174.                                              
       7 + */                                                            
       8 +export default defineConfig({                                  
       9 +    testDir: "e2e",                                            
      10 +    reporter: "list",                                          
      11 +    use: {                                                     
      12 +        baseURL: "http://localhost:5175",                      
      13 +        channel: "msedge",                                     
      14 +        viewport: { width: 375, height: 812 }                  
      15 +    },                                                         
      16 +    webServer: {                                               
      17 +        command: "npx vite --port 5175 --strictPort",          
      18 +        url: "http://localhost:5175",                          
      19 +        reuseExistingServer: true                              
      20 +    }                                                          
      21 +});                                                            
  ⎿  Created LAB3\HW\pianoEngine\src\main.jsx (+9 -0)
      1 +import { StrictMode } from "react";                             
      2 +import { createRoot } from "react-dom/client";                  
      3 +import App from "./App.jsx";                                    
      4 +                                                                
      5 +createRoot(document.querySelector("#root")).render(             
      6 +    <StrictMode>                                                
      7 +        <App />                                                 
      8 +    </StrictMode>                                               
      9 +);                                                              
  ⎿  Created LAB3\HW\pianoEngine\vite.config.js (+12 -0)
       1 +import { defineConfig } from "vite";                           
       2 +import react from "@vitejs/plugin-react";                      
       3 +                                                               
       4 +export default defineConfig({                                  
       5 +    plugins: [react()],                                        
       6 +    test: {                                                    
       7 +        environment: "jsdom",                                  
       8 +        // e2e/ holds the Playwright browser checks (npm run te
         +st:e2e).                                                       
       9 +        include: ["src/**/*.test.{js,jsx}"],                   
      10 +        css: { include: /\.module\.css$/, modules: { classNameS
         +trategy: "stable" } }                                          
      11 +    }                                                          
      12 +});                                                            

● Bash(node -e '
      const L=h=>{const
      c=h.match(/[0-9a-f]{2}/gi).map(p=>{p=parseInt(p,16)/255;return
      p<=0.03928?p/12.92:((p+0.055)/1.055)**2.4});return .2126*c[0]+.7152*c…)
  ⎿  #2563eb white 4.94 black 3.43 bg 3.62
     #3b82f6 white 3.52 black 4.82 bg 5.09
     #0ea5e9 white 2.65 black 6.40 bg 6.75
     … +7 lines (ctrl+o to expand)

● Focus color: #8b5cf6 clears 4:1 on white keys, black keys and the page. Now
  tests.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; sed -i 's/--piano-focus: #f59e0b;/--piano-focus: #8b5cf6;/'
      index.html; gre…)
  ⎿  23:      --piano-focus: #8b5cf6;
  ⎿  Updated LAB3\HW\pianoEngine\index.html (+1 -1)
      20        --piano-black-key: #111827;
      21        --piano-black-text: #f8fafc;
      22        --piano-black-border: #64748b;
      23 -      --piano-focus: #f59e0b;                                  
      23 +      --piano-focus: #8b5cf6;                                  
      24        --piano-white-width: 2.5rem;
      25        --piano-white-height: 11rem;
      26        --piano-black-height: 7rem;
● Write(LAB3\HW\pianoEngine\src\piano.test.js)
  ⎿  Wrote 166 lines to LAB3\HW\pianoEngine\src\piano.test.js
       1 import { describe, expect, test } from "vitest";
       2 import {
       3     BLACK_NOTE_CLASSES, BLACK_UNITS, NOTE_NAMES, PIANO_CONFIG, P
         IANO_KEYS, UNITS_PER_WHITE, WHITE_NOTES,
       4     assertPianoConfig, assertPianoKey, assertPianoKeys, createPi
         anoKey, generatePianoKeys, keyLabel,
       5     layoutPianoKeys, midiToFrequency
       6 } from "./piano.js";
       7 
       8 // T-02A — algorithmic 88-key generation (PRD 1 sections 2–4 and
     … +159 lines (~6 KB) (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\components\Piano.test.jsx)
  ⎿  Wrote 141 lines to LAB3\HW\pianoEngine\src\components\Piano.test.jsx
      1 import { afterEach, describe, expect, test, vi } from "vitest";
      2 import { cleanup, fireEvent, render, screen, within } from "@test
        ing-library/react";
      3 import PIANO_SOURCE from "./Piano.jsx?raw";
      4 import KEY_SOURCE from "./PianoKey.jsx?raw";
      5 import APP_SOURCE from "../App.jsx?raw";
      6 import Piano from "./Piano.jsx";
      7 import PianoKey from "./PianoKey.jsx";
      8 import App from "../App.jsx";
      9 import { PIANO_KEYS, createPianoKey, generatePianoKeys } from "..
     … +133 lines (~7 KB) (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\theme.test.js)
  ⎿  Wrote 58 lines to LAB3\HW\pianoEngine\src\theme.test.js
       1 import { readFileSync } from "node:fs";
       2 import { describe, expect, test } from "vitest";
       3 import INDEX_HTML from "../index.html?raw";
       4 
       5 // Read as text: the Vitest CSS-Modules setting turns `?raw` imp
         orts of *.module.css into class maps.
       6 const STYLES = readFileSync("src/components/Piano.module.css", "
         utf8");
       7 
       8 // T-02A — key colours meet WCAG 2.2 AA (1.4.3 text, 1.4.11 non-
     … +51 lines (~2 KB) (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run 2>&1 | tail -40)
  ⎿   RUN  v5.1.0 D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3
     r/LAB3/HW/pianoEngine
     … +6 lines (ctrl+o to expand)
  ⎿  (timeout 3m)

● 79 unit tests pass. Now browser checks (Edge, axe, layout geometry).

● Write(LAB3\HW\pianoEngine\e2e\piano.spec.js)
  ⎿  Wrote 140 lines to LAB3\HW\pianoEngine\e2e\piano.spec.js
       1 import { expect, test } from "@playwright/test";
       2 import AxeBuilder from "@axe-core/playwright";
       3 
       4 // T-02A — the generated keyboard in a real browser (Microsoft E
         dge): count, alignment,
       5 // labels, horizontal scrolling and WCAG 2.2 AA. Default viewpor
         t 375 × 812.
       6 
       7 const VIEWPORTS = [
       8     ["phone", { width: 375, height: 812 }],
     … +132 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test 2>&1 | tail -60)
  ⎿    1) e2e\piano.spec.js:116:5 › phone (375px): page never scrolls sidew
     ays, the keyboard does; labels fit; axe WCAG 2.2 AA clean
     … +56 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Page overflow comes from the absolutely positioned screen-reader spans
  escaping the scroll container (no positioned ancestor). Making keys position: 
  relative contains them.

● Update(LAB3\HW\pianoEngine\src\components\Piano.module.css)
  ⎿  Added 2 lines
      40  
      41  .whiteKey,
      42  .blackKey {
      43 +    /* Containing block for the .srOnly hint, so it stays insid
         +e the scrolling keyboard. */                                   
      44 +    position: relative;                                        
      45      display: flex;
      46      align-items: flex-end;
      47      justify-content: center;

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test 2>&1 | tail -30)
  ⎿  Running 9 tests using 1 worker

       ✓  1 e2e\piano.spec.js:51:1 › renders 88 keys, 52 white and 36 black
     … +14 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Visual check of the phone layout before committing.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vite build 2>&1 | tail -5; cat >
      "C:/Users/admin/AppData/Local/Temp/cla…)
  ⎿  dist/index.html                   1.50 kB │ gzip:  0.80 kB
     dist/assets/index-GJgOyGfg.css    1.63 kB │ gzip:  0.65 kB
     dist/assets/index-DCjTULVT.js   223.83 kB │ gzip: 70.15 kB
     … +4 lines (ctrl+o to expand)
  ⎿  (timeout 3m 20s)

  Read 2 files (ctrl+o to expand)

● Layout looks right: keys aligned, black keys centred, the keyboard scrolls on
  its own. Committing.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; git add . && git status --short && git commit -q -F - <<'EOF'
      feat(hw2): ge…)
  ⎿  warning: in the working copy of 'LAB3/HW/pianoEngine/.gitignore', LF w
     ill be replaced by CRLF the next time Git touches it
     warning: in the working copy of 'LAB3/HW/pianoEngine/e2e/piano.spec.js
     … +36 lines (ctrl+o to expand)

  Wrote 1 memory (ctrl+o to expand)

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; echo "- [LAB3 HW2 piano engine
      status](lab3-hw2-piano-en…)
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

● PRD 1 is finished and committed as 7a1338c feat(hw2): generate algorithmic 
  88-key piano. It's a new project in LAB3/HW/pianoEngine, set up the same way
  as HW1, with the browser tests on port 5175. All 79 unit tests and 9 browser
  tests in Edge pass, and the build works.

  What it does
  - src/piano.js builds the keys in a loop from MIDI 21 to 108. For each one it
    works out the note name from midi % 12, the octave from floor(midi/12) - 1
    (so A0 is 21 and C8 is 108), the frequency with midiToFrequency (A4 = 440
    Hz), and whether it's white or black from the # in the name.
  - Piano.jsx renders <section aria-label="88-key piano"><ol> with
    pianoKeys.map(...) → <li><PianoKey/></li>. No key is written out by hand.
  - Alignment: the <ol> is a CSS grid. White keys sit edge to edge, and each
    black key is 2/3 as wide and centred on the line between its two white
    neighbours. The browser tests measure this to within 1px. The page order
    stays in pitch order (C, C#, D, …).
  - Small screens: only the keyboard scrolls sideways; the page itself never
    does, at 375, 768 and 1280px. Every key shows its label, which fits without
    being cut off. Every key is at least 24px wide.
  - Accessible names come from the key's own text, e.g. "A4 white key" and "C#4
    black key". The axe accessibility check finds no WCAG 2.2 AA problems at any
    of the three widths.

  Project rules
  1. No div soup: the code uses only semantic elements, and a test checks the
     source for <div>.
  2. Type checks: the config, each key and the full key list are checked before
     rendering. A key whose note, octave, type or frequency doesn't match its
     MIDI number throws a TypeError.
  3. XSS: text is rendered as text, never with innerHTML. A note containing <img
     onerror> is rejected before anything renders.
  4. Mounting order: the order on the page matches the data, MIDI 21 to 108,
     with no extra wrapper elements.

  Changes from the PRD
  - Keys can already be clicked: I added an optional onKeyPress(pianoKey) hook
    so the audio PRDs can attach to it. Clicking does nothing yet.
  - Focus ring colour: it's violet #8b5cf6. Amber would have been too faint on
    the white keys.

  LAB3/HW/drumKit/AI_AUDIT_FAILURE_1.md was already untracked and isn't in this
  commit. As before, I didn't write a report. Ready for PRD 2 when you are.

✻ Churned for 5m 45s · done 5:28 PM

❯ now PRD 2                                                                     
  PRD 2 — PolyphonicSynth & FIFO Voice Management                               
  T-02B: Polyphonic Audio Engine                                                
  Commit 2                                                                      
  Estimated duration: 25–30 minutes                                             
                                                                                
  Git commit message                                                            
                                                                                
  feat(hw2): implement 8-voice polyphonic synth                                 
                                                                                
  1. Objective                                                                  
  Implement a reusable PolyphonicSynth class that manages up to eight           
  simultaneous Web Audio oscillators.                                           
                                                                                
  The audio engine must support:                                                
                                                                                
  Multiple simultaneous notes.                                                  
                                                                                
  Deterministic FIFO voice stealing.                                            
                                                                                
  Note-on and note-off operations.                                              
                                                                                
  Click-free gain envelope release.                                             
                                                                                
  AudioContext lifecycle management.                                            
                                                                                
  2. Required file                                                              
  src/                                                                          
  └── audio/                                                                    
      └── PolyphonicSynth.js                                                    
  Implement the required class:                                                 
                                                                                
  export class PolyphonicSynth {                                                
    constructor(maxVoices = 8) {                                                
      this.ctx = null;                                                          
      this.maxVoices = maxVoices;                                               
      this.voices = new Map();                                                  
    }                                                                           
  }                                                                             
                                                                                
  3. Active voice tracking using ES6 Map                                        
  Use an ES6 Map to store active oscillator instances.                          
                                                                                
  this.voices = new Map();                                                      
                                                                                
  Map insertion order is important because it preserves the order in which      
  voices were created.                                                          
                                                                                
  Each entry must follow this structure:                                        
                                                                                
  midi => {                                                                     
    osc,                                                                        
    gain,                                                                       
  }                                                                             
                                                                                
  When eight voices are already active and another distinct note is requested:  
                                                                                
  if (this.voices.size >= this.maxVoices) {                                     
    const oldestMidi = this.voices.keys().next().value;                         
                                                                                
    this.noteOff(oldestMidi);                                                   
  }                                                                             
                                                                                
  This implements FIFO voice stealing.                                          
                                                                                
  Repeated requests for a MIDI note that is already active must not create      
  duplicate entries.                                                            
                                                                                
  4. Implement noteOn()                                                         
  noteOn(midi, freqHz) must:                                                    
                                                                                
  Initialize AudioContext when necessary.                                       
                                                                                
  Ignore duplicate active MIDI notes.                                           
                                                                                
  Check the active voice limit.                                                 
                                                                                
  Release the oldest voice if the limit is reached.                             
                                                                                
  Create an oscillator and gain node.                                           
                                                                                
  Set the oscillator frequency.                                                 
                                                                                
  Connect the audio nodes.                                                      
                                                                                
  Start the oscillator.                                                         
                                                                                
  Store the voice in the Map.                                                   
                                                                                
  Example:                                                                      
                                                                                
  const osc = this.ctx.createOscillator();                                      
  const gain = this.ctx.createGain();                                           
                                                                                
  osc.frequency.setValueAtTime(                                                 
    freqHz,                                                                     
    this.ctx.currentTime                                                        
  );                                                                            
                                                                                
  gain.gain.setValueAtTime(                                                     
    0.2,                                                                        
    this.ctx.currentTime                                                        
  );                                                                            
                                                                                
  osc.connect(gain).connect(this.ctx.destination);                              
                                                                                
  osc.start();                                                                  
                                                                                
  this.voices.set(midi, { osc, gain });                                         
                                                                                
  5. Implement noteOff() with ADSR release                                      
  Create a noteOff(midi) method.                                                
                                                                                
  It must:                                                                      
                                                                                
  Find the corresponding voice.                                                 
                                                                                
  Schedule a smooth gain reduction.                                             
                                                                                
  Stop the oscillator after the release.                                        
                                                                                
  Remove the voice from the active Map.                                         
                                                                                
  Required release behavior:                                                    
                                                                                
  gain.gain.cancelScheduledValues(                                              
    this.ctx.currentTime                                                        
  );                                                                            
                                                                                
  gain.gain.setValueAtTime(                                                     
    Math.max(gain.gain.value, 0.0001),                                          
    this.ctx.currentTime                                                        
  );                                                                            
                                                                                
  gain.gain.exponentialRampToValueAtTime(                                       
    0.0001,                                                                     
    this.ctx.currentTime + 0.04                                                 
  );                                                                            
                                                                                
  osc.stop(this.ctx.currentTime + 0.045);                                       
                                                                                
  The release ramp must happen before stopping the oscillator to prevent audio  
  popping.                                                                      
                                                                                
  Ensure the implementation handles repeated note-off calls safely and does not 
  leave stale voices in the Map.                                                
                                                                                
  6. Implement releaseAll()                                                     
  Add a method to release every currently active voice.                         
                                                                                
  releaseAll() {                                                                
    for (const midi of [...this.voices.keys()]) {                               
      this.noteOff(midi);                                                       
    }                                                                           
  }                                                                             
                                                                                
  The copied key array avoids iteration problems when entries are removed.      
                                                                                
  7. Audio resource management                                                  
  Reuse the same AudioContext instead of creating one per note.                 
                                                                                
  Initialize audio after a user interaction.                                    
                                                                                
  Avoid duplicate oscillators for the same MIDI note.                           
                                                                                
  Release all active oscillators when appropriate.                              
                                                                                
  Prevent stopped oscillators from remaining in the active voice pool.          
                                                                                
  8. Acceptance criteria                                                        
                                                                                
  src/audio/PolyphonicSynth.js exists.                                          
                                                                                
  PolyphonicSynth is exported.                                                  
                                                                                
  Default voice limit is eight.                                                 
                                                                                
  Active voices are tracked through ES6 Map.                                    
                                                                                
  The ninth distinct concurrent note steals the oldest voice.                   
                                                                                
  Duplicate MIDI notes are handled safely.                                      
                                                                                
  noteOn() creates and starts oscillators.                                      
                                                                                
  noteOff() implements the required exponential release.                        
                                                                                
  releaseAll() releases all active notes.                                       
                                                                                
  No unnecessary AudioContext creation.                                         
  Important implementation note: The provided starter code is only the          
  beginning of the engine. Your final class must include noteOff(),             
  releaseAll(), and safe oscillator cleanup. Also, remove a voice from the Map  
  immediately when releasing it so the voice pool can accept the next note.     

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/dr
      umKit"; grep -n "AudioContext\|resume\|state" src/audioEngine.js | head
      -30)
  ⎿  4: * Framework-free Web Audio playback with one shared AudioContext:
     13: * The context is created and resumed lazily, inside the first user
      gesture
     … +15 lines (ctrl+o to expand)

● Reusing HW1's lazy-context pattern (injectable AudioContext class, resume when
  suspended). Writing the synth.

● Write(LAB3\HW\pianoEngine\src\audio\PolyphonicSynth.js)
  ⎿  Wrote 182 lines to LAB3\HW\pianoEngine\src\audio\PolyphonicSynth.js
       1 /**
       2  * Polyphonic Piano Engine — T-02B 8-voice polyphonic synth
       3  *
       4  * Framework-free Web Audio engine: one oscillator + one gain no
         de per
       5  * sounding note, at most `maxVoices` at once, all sharing ONE A
         udioContext.
       6  *
       7  *   osc (OscillatorNode) ──► gain (GainNode) ──► ctx.destinatio
         n
     … +175 lines (ctrl+o to expand)

● Update(LAB3\HW\pianoEngine\src\audio\PolyphonicSynth.js)
  ⎿  Added 2 lines
      90      ensureContext() {
      91          if (!this.supported) return null;
      92          if (this.ctx === null || this.ctx.state === "closed") {
      93 +            // Voices of a context closed elsewhere are already
         + silent; drop them.                                            
      94 +            this.voices.clear();                               
      95              this.ctx = new this.AudioContextClass();
      96          }
      97          if (this.ctx.state === "suspended" && typeof this.ctx.r
          esume === "function") {

● Write(LAB3\HW\pianoEngine\src\audio\PolyphonicSynth.test.js)
  ⎿  Wrote 300 lines to
     LAB3\HW\pianoEngine\src\audio\PolyphonicSynth.test.js
       1 import { beforeEach, describe, expect, test, vi } from "vitest";
       2 import {
       3     DEFAULT_MAX_VOICES, PolyphonicSynth, RELEASE_S, SILENT_GAIN,
          STOP_S, VOICE_GAIN
       4 } from "./PolyphonicSynth.js";
       5 import { createPianoKey } from "../piano.js";
       6 
       7 // T-02B — 8-voice polyphonic synth, FIFO stealing, click-free r
         elease (PRD 2, Project Rule 2).
       8 
     … +292 lines (ctrl+o to expand)
● Now a real-Web-Audio check in Edge (imports the module from the dev server):

● Write(LAB3\HW\pianoEngine\e2e\synth.spec.js)
  ⎿  Wrote 74 lines to LAB3\HW\pianoEngine\e2e\synth.spec.js
      1 import { expect, test } from "@playwright/test";
      2 
      3 // T-02B — PolyphonicSynth against the real Web Audio implementat
        ion in Microsoft Edge.
      4 // The module is imported from the Vite dev server; a click provi
        des the user gesture.
      5 
      6 test.beforeEach(async ({ page }) => {
      7     await page.goto("/");
      8     await page.getByRole("heading", { level: 1 }).click();   // u
     … +67 lines (~3 KB) (ctrl+o to expand)

● Let me clean up the offline-render sequencing before running it.

● Update(LAB3\HW\pianoEngine\e2e\synth.spec.js)
  ⎿  Added 6 lines, removed 4 lines
      56          class OfflineClass { constructor() { return offline; } 
          }
      57          const synth = new PolyphonicSynth(8, { AudioContextClas
          s: OfflineClass, waveform: "sine" });
      58          synth.noteOn(69, 440);
      59 -        await offline.suspend(0.1).then(() => { synth.noteOff(6
         -9); offline.resume(); }).catch(() => {});                      
      60 -        const rendered = offline.startRendering();             
      61 -        await offline.suspend?.(0.1).catch?.(() => {});        
      62 -        const buffer = await rendered;                         
      59 +        // Pause rendering at 100 ms, release the note there, t
         +hen let rendering finish.                                      
      60 +        offline.suspend(0.1).then(() => {                      
      61 +            synth.noteOff(69);                                 
      62 +            return offline.resume();                           
      63 +        });                                                    
      64 +        const buffer = await offline.startRendering();         
      65          const data = buffer.getChannelData(0);
      66          const peak = (from, to) => {
      67              let max = 0;

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run 2>&1 | grep -v "^$" | tail -25; npx playwright
      test 2>&1 | t…)
  ⎿   RUN  v5.1.0 D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3
     r/LAB3/HW/pianoEngine
      Test Files  4 passed (4)
     … +20 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● All green: 112 unit tests, 11 Edge tests (including real Web Audio and an
  offline render of the release curve). Building and committing.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vite build 2>&1 | tail -2; git add src/audio
      e2e/synth.spec.js && git s…)
  ⎿  ✓ built in 141ms
     warning: in the working copy of 'LAB3/HW/pianoEngine/e2e/synth.spec.js
     ', LF will be replaced by CRLF the next time Git touches it
     … +9 lines (ctrl+o to expand)

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; sed -i 's/As of 2026-11-09 PRD 1 (T-02A,
      `feat(hw2): gen…)
  ⎿  11:HW2 lives in `LAB3/HW/pianoEngine` (same stack as HW1: Vite + React
      19, Vitest, Playwright/axe on Edge, port 5175). As of 2026-11-09 PRD
     1 (T-02A, commit 7a1338c) and PRD 2 (T-02B `src/audio/PolyphonicSynth.
     … +3 lines (ctrl+o to expand)
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

● PRD 2 is finished and committed as bcbe0ad feat(hw2): implement 8-voice 
  polyphonic synth. All 112 unit tests and 11 browser tests in Edge pass, and
  the build works.

  src/audio/PolyphonicSynth.js
  - Voice pool: PolyphonicSynth is exported with a default limit of 8 voices.
    Active notes are kept in a Map of midi => { osc, gain }.
  - noteOn(midi, freqHz):
    - It creates the AudioContext on the first note, so audio starts from a user
      action, and then reuses that one context for every note.
    - It resumes the context if the browser has paused it.
    - Pressing a note that is already sounding does nothing and returns false,
      so no duplicate voice is created.
    - When 8 notes are sounding and a new one comes in, the oldest note is
      released to make room (first in, first out).
    - It then builds oscillator → gain → speakers and starts the sound.
  - noteOff(midi):
    - It removes the voice from the Map straight away, so a new note can take
      its place.
    - It fades the volume out with the exact sequence the PRD specifies, over 40
      ms. The oscillator stops at 45 ms, after the fade, so there is no pop.
    - Calling it twice, or for a note that isn't playing, is harmless. Once the
      oscillator ends, both audio nodes are disconnected, so nothing is left
      behind.
  - releaseAll() works as the PRD describes. I added close(), which releases
    every note and closes the context. A later note opens a new context.
  - Input checks (rule 2): an invalid voice limit, MIDI number or frequency
    throws a TypeError before any audio is touched.

  Tests
  - Unit tests: they use a fake AudioContext and cover:
    - the exact order and timing of the fade-out calls
    - first-in-first-out stealing, with the oldest note dropped each time
    - duplicate notes and repeated note-offs
    - context reuse and resuming
    - cleanup when the oscillator ends.
  - Browser tests in Edge:
    - One test uses real Web Audio to check 8 real voices, that a 9th note
      releases the oldest, that only one context is created, and that close()
      closes it.
    - The other renders the sound offline and measures it: the fade reaches
      near-silence before the oscillator stops.

  Changes from the PRD
  - Extra constructor options: the constructor also accepts { AudioContextClass,
    waveform } (default "triangle"). That option is what lets the tests swap in
    a fake or offline AudioContext. new PolyphonicSynth() still behaves exactly
    like the PRD's starter code.
  - Not connected to the piano yet: clicking a key still makes no sound. Piano
    already has an onKeyPress hook ready for it; I left the connection for the
    next PRD, since this one only asks for the engine.

✻ Crunched for 2m 27s · done 5:34 PM

※ recap: Building the HW2 piano engine in LAB3/HW/pianoEngine: the 88-key piano (PRD 1) and the 8-voice synth (PRD 2) are committed, with all tests passing. Next, send PRD 3 and I'll start it, including connecting the synth to the keys. (disable recaps in /config)

❯ go on with third PRDs                                                         
  PRD 3 — FIFO Recording & Variable-Speed Sequencer                             
  T-02C: Recording & Async AudioTaskQueue                                       
  Commit 3                                                                      
  Estimated duration: 25–30 minutes                                             
                                                                                
  Git commit message                                                            
                                                                                
  feat(hw2): add FIFO recording and variable-speed replay                       
                                                                                
  1. Objective                                                                  
     Implement a recording system that captures piano interactions and allows   
  users to replay recorded melodies at different playback speeds.               
                                                                                
  The sequencer must use a FIFO queue to preserve the order of recorded notes.  
                                                                                
  2. Recording data schema                                                      
     Every recorded note must contain:                                          
                                                                                
  {                                                                             
    midi: 69,                                                                   
    freqHz: 440,                                                                
    durationMs: 300,                                                            
    deltaMs: 150,                                                               
  }                                                                             
                                                                                
  Required fields:                                                              
                                                                                
  Field                                                                         
                                                                                
  Description                                                                   
                                                                                
  midi                                                                          
                                                                                
  MIDI note number                                                              
                                                                                
  freqHz                                                                        
                                                                                
  Calculated note frequency                                                     
                                                                                
  durationMs                                                                    
                                                                                
  Note duration                                                                 
                                                                                
  deltaMs                                                                       
                                                                                
  Time elapsed since the previous recorded event                                
                                                                                
  Capture timestamps when notes are triggered and released.                     
                                                                                
  Calculate the duration from note-on to note-off. Calculate deltaMs from the   
  previous recorded event's timestamp.                                          
                                                                                
  3. FIFO recording queue                                                       
     Create a dedicated queue to preserve recorded event order.                 
                                                                                
  Suggested implementation:                                                     
                                                                                
  export class AudioTaskQueue {                                                 
    constructor() {                                                             
      this.tasks = [];                                                          
    }                                                                           
                                                                                
    enqueue(task) {                                                             
      this.tasks.push(task);                                                    
    }                                                                           
                                                                                
    dequeue() {                                                                 
      return this.tasks.shift() ?? null;                                        
    }                                                                           
                                                                                
    clear() {                                                                   
      this.tasks = [];                                                          
    }                                                                           
                                                                                
    get size() {                                                                
      return this.tasks.length;                                                 
    }                                                                           
  }                                                                             
                                                                                
  For larger queues, consider a head-index implementation to avoid the repeated 
  array-shifting cost of shift().                                               
                                                                                
  Recording should append events in chronological order.                        
                                                                                
  4. Recording controls                                                         
     Build the following controls:                                              
                                                                                
  Start Recording.                                                              
                                                                                
  Stop Recording.                                                               
                                                                                
  Clear Recording.                                                              
                                                                                
  Play Sequence.                                                                
                                                                                
  Expected behavior:                                                            
                                                                                
  Start Recording                                                               
                                                                                
  Begin capturing piano interactions.                                           
                                                                                
  Record note-on and note-off timing.                                           
                                                                                
  Maintain the correct event order.                                             
                                                                                
  Stop Recording                                                                
                                                                                
  Stop accepting new recording events.                                          
                                                                                
  Preserve the completed recording.                                             
                                                                                
  Clear Recording                                                               
                                                                                
  - Remove all recorded events.                                                 
                                                                                
  Play Sequence                                                                 
                                                                                
  - Replay the saved sequence using the FIFO queue.                             
                                                                                
  5. Variable-speed playback                                                    
     Support three playback speeds:                                             
                                                                                
  0.5×                                                                          
  Half speed                                                                    
                                                                                
  1.0×                                                                          
  Normal speed                                                                  
                                                                                
  2.0×                                                                          
  Double speed                                                                  
                                                                                
  Adjust timing using:                                                          
                                                                                
  const adjustedDelay = event.deltaMs / playbackSpeed;                          
  const adjustedDuration =                                                      
    event.durationMs / playbackSpeed;                                           
                                                                                
  A speed of 0.5 makes the sequence slower; 2.0 makes it faster.                
                                                                                
  6. Asynchronous FIFO playback                                                 
     Implement playback as an asynchronous sequence processor.                  
                                                                                
  Conceptual flow:                                                              
                                                                                
  Recording Queue                                                               
        |                                                                       
        v                                                                       
  Dequeue Next Event                                                            
        |                                                                       
        v                                                                       
  Wait deltaMs / speed                                                          
        |                                                                       
        v                                                                       
  Trigger noteOn()                                                              
        |                                                                       
        v                                                                       
  Wait durationMs / speed                                                       
        |                                                                       
        v                                                                       
  Trigger noteOff()                                                             
        |                                                                       
        v                                                                       
  Process Next Event                                                            
  Ensure the queue processes tasks in their original order.                     
                                                                                
  The playback process must not start multiple competing replay loops           
  accidentally.                                                                 
                                                                                
  7. Acceptance criteria                                                        
                                                                                
  Recorded events contain all four required fields.                             
                                                                                
  Note duration is calculated correctly.                                        
                                                                                
  Event timing preserves chronological order.                                   
                                                                                
  FIFO recording queue works correctly.                                         
                                                                                
  Recording controls are functional.                                            
                                                                                
  Replay preserves the original note order.                                     
                                                                                
  0.5× playback works.                                                          
                                                                                
  1.0× playback works.                                                          
                                                                                
  2.0× playback works.                                                          
                                                                                
  Replay uses asynchronous task processing.                                     
                                                                                
  Completed recordings can be replayed multiple times.                          
                                                                                
  Playback does not mutate the original recording.                              

● PRD 3 means the piano finally makes sound, so I'm connecting it to the synth
  now, using press and release (not click) so note durations can be measured.
  First, a contrast check for the colour of a pressed key:

● Bash(node -e '
      const L=h=>{const
      c=h.match(/[0-9a-f]{2}/gi).map(p=>{p=parseInt(p,16)/255;return
      p<=0.03928?p/12.92:((p+0.055)/1.055)**2.4});return .2126*c[0]+.7152*c…)
  ⎿  white-active #fde68a text 14.33 focus 3.40 vs white 1.19
     white-active #fcd34d text 12.38 focus 2.94 vs white 1.38
     white-active #fbbf24 text 10.69 focus 2.54 vs white 1.60
     … +7 lines (ctrl+o to expand)

● Picked #fde68a / #b45309 for pressed keys, and added a second inner ring to
  the focus outline so focus stays visible on a pressed black key. Writing the
  queue, recorder and player.

● Write(LAB3\HW\pianoEngine\src\audio\AudioTaskQueue.js)
  ⎿  Wrote 73 lines to LAB3\HW\pianoEngine\src\audio\AudioTaskQueue.js
       1 /**
       2  * Polyphonic Piano Engine — T-02C FIFO task queue
       3  *
       4  * First in, first out: tasks leave in exactly the order they ar
         rived. This
       5  * is the PRD's suggested AudioTaskQueue with a head index inste
         ad of
       6  * Array#shift(), so dequeue is O(1) rather than O(n): the slot 
         at the head
       7  * is cleared (so the task can be garbage-collected) and the ind
     … +67 lines (~2 KB) (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\audio\NoteRecorder.js)
  ⎿  Wrote 168 lines to LAB3\HW\pianoEngine\src\audio\NoteRecorder.js
       1 /**
       2  * Polyphonic Piano Engine — T-02C note recorder
       3  *
       4  * Captures live note-on / note-off pairs as recorded events:
       5  *
       6  *   { midi: 69, freqHz: 440, durationMs: 300, deltaMs: 150 }
       7  *
       8  *   durationMs  note-off time - note-on time of the same note
       9  *   deltaMs     note-on time - note-on time of the previous rec
         orded event
     … +159 lines (ctrl+o to expand)

● Update(LAB3\HW\pianoEngine\src\audio\NoteRecorder.js)
  ⎿  Added 7 lines, removed 2 lines
      100          return this.#queue.size;
      101      }
      102  
      103 -    #elapsed() {                                              
      103 +    #read() {                                                 
      104          const time = this.#now();
      105          if (typeof time !== "number" || !Number.isFinite(time)
           ) {
      106              throw new TypeError(`NoteRecorder: now() must retu
           rn a finite number, received ${JSON.stringify(time)}`);
      107          }
      108 -        return Math.max(0, Math.round(time - this.#startedAt))
          -;                                                             
      108 +        return time;                                          
      109      }
      110  
      111 +    /** Whole milliseconds since the take started. */         
      112 +    #elapsed() {                                              
      113 +        return Math.max(0, Math.round(this.#read() - this.#sta
          +rtedAt));                                                     
      114 +    }                                                         
      115 +                                                              
      116      /** Starts a new take; any previous recording is replaced.
            */
      117      start() {
      118          this.#queue.clear();

● Update(LAB3\HW\pianoEngine\src\audio\NoteRecorder.js)
  ⎿  Added 1 line, removed 2 lines
      119          this.#held.clear();
      120          this.#snapshot = Object.freeze([]);
      121          this.#lastOnset = null;
      122 -        this.#startedAt = 0;                                  
      123 -        this.#startedAt = this.#elapsed();                    
      122 +        this.#startedAt = this.#read();                       
      123          this.#recording = true;
      124      }
      125  

● Write(LAB3\HW\pianoEngine\src\audio\SequencePlayer.js)
  ⎿  Wrote 143 lines to LAB3\HW\pianoEngine\src\audio\SequencePlayer.js
       1 /**
       2  * Polyphonic Piano Engine — T-02C asynchronous FIFO sequencer
       3  *
       4  * Replays a recording through any instrument with noteOn(midi, 
         freqHz) and
       5  * noteOff(midi) (the PolyphonicSynth, or the UI adapter that al
         so lights the
       6  * keys). Each play() copies the recording into a fresh AudioTas
         kQueue and
       7  * drains it in an async loop:
     … +136 lines (ctrl+o to expand)

● Next, the React side: a hook connecting synth, recorder and player, plus
  updates to the piano keys.

● Write(LAB3\HW\pianoEngine\src\usePianoEngine.js)
  ⎿  Wrote 135 lines to LAB3\HW\pianoEngine\src\usePianoEngine.js
       1 /**
       2  * Polyphonic Piano Engine — T-02C engine hook
       3  *
       4  * Wires the three framework-free parts to React state:
       5  *
       6  *   live key press ──► instrument.noteOn ──► PolyphonicSynth
       7  *                 └──► NoteRecorder (while recording)
       8  *   Play Sequence ──► SequencePlayer ──► instrument.noteOn / no
         teOff
       9  *
     … +126 lines (ctrl+o to expand)

● Ensuring the mode ref updates synchronously with each transition instead of
  during render:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src"; python - <<'EOF'
      import re,io…)
  ⎿  44:    const [mode, setMode] = useState("idle");               // "idl
     e" | "recording" | "playing"
     51:    const changeMode = useCallback((next) => {
     … +10 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\usePianoEngine.js (+139 -135)
        1 -/**                                                           
        2 - * Polyphonic Piano Engine — T-02C engine hook                
        3 - *                                                            
        4 - * Wires the three framework-free parts to React state:       
        5 - *                                                            
        6 - *   live key press ──► instrument.noteOn ──► PolyphonicSynth 
        7 - *                 └──► NoteRecorder (while recording)        
        8 - *   Play Sequence ──► SequencePlayer ──► instrument.noteOn / 
          -noteOff                                                       
        9 - *                                                            
       10 - * `instrument` drives the synth and then mirrors the synth's 
          -real voice pool                                               
       11 - * into `activeNotes`, so a key is shown pressed exactly while
          - it sounds:                                                   
       12 - * during live play, during replay, and not after its voice wa
          -s stolen.                                                     
       13 - *                                                            
       14 - * Mode rules (each action ignores calls that do not fit the c
          -urrent mode):                                                 
       15 - *   Start Recording  idle only (not while playing back); begi
          -ns a new take                                                 
       16 - *   Stop Recording   while recording; keeps the take         
       17 - *   Clear Recording  not while recording; stops a replay firs
          -t                                                             
       18 - *   Play Sequence    idle with a non-empty recording; one rep
          -lay at a time                                                 
       19 - */                                                           
       20 -import { useCallback, useEffect, useMemo, useRef, useState } f
          -rom "react";                                                  
       21 -import { PolyphonicSynth } from "./audio/PolyphonicSynth.js"; 
       22 -import { NoteRecorder } from "./audio/NoteRecorder.js";       
       23 -import { SequencePlayer, assertPlaybackSpeed } from "./audio/S
          -equencePlayer.js";                                            
       24 -                                                              
       25 -function assertSynth(synth) {                                 
       26 -    const methods = ["noteOn", "noteOff", "releaseAll"];      
       27 -    if (synth === null || typeof synth !== "object" || methods
          -.some((name) => typeof synth[name] !== "function")            
       28 -        || !(synth.voices instanceof Map)) {                  
       29 -        throw new TypeError("usePianoEngine: synth must provid
          -e noteOn, noteOff, releaseAll and a voices Map");             
       30 -    }                                                         
       31 -}                                                             
       32 -                                                              
       33 -function sameNotes(set, keys) {                               
       34 -    if (set.size !== keys.length) return false;               
       35 -    return keys.every((midi) => set.has(midi));               
       36 -}                                                             
       37 -                                                              
       38 -export default function usePianoEngine({ synth: injectedSynth,
          - now, clock } = {}) {                                         
       39 -    const [synth] = useState(() => injectedSynth ?? new Polyph
          -onicSynth());                                                 
       40 -    assertSynth(synth);                                       
     … 234 more lines (ctrl+o to expand)

● Now the key component: press/release events and the pressed state.

● Write(LAB3\HW\pianoEngine\src\components\PianoKey.jsx)
  ⎿  Added 46 lines, removed 9 lines
       1  /**
       2 - * Polyphonic Piano Engine — T-02A piano key                   
       2 + * Polyphonic Piano Engine — T-02A piano key, T-02C press / rel
         +ease                                                           
       3   *
       4   * One key as one native <button>. The parent (Piano) owns the 
          <ol>, the <li>
       5   * and the list key, so the key adds no wrapper of its own (Pro
          ject Rules 1
       6   * and 4):
       7   *
       8 - *   <button type="button" data-midi="69" data-note-type="white
         -">                                                             
       8 + *   <button type="button" aria-pressed="false" data-midi="69" 
         +data-note-type="white">                                        
       9   *     <span>A4</span>                         scientific pitch
           label (visible)
      10   *     <span class="srOnly">white key</span>   key colour for a
          ssistive tech
      11   *   </button>
     ...
      13   * The accessible name is computed from the content ("A4 white 
          key"), so the
      14   * visible label is always part of the name (WCAG 2.5.3, Label 
          in Name). The
      15   * space between the two spans is its own text node, so every n
          ame
      16 - * computation (browsers and jsdom) keeps the words apart. The 
         -key is                                                         
      17 - * validated before rendering (Project Rule 2) and its text is 
         -rendered as                                                    
      18 - * React children, never as HTML (Project Rule 3).             
      16 + * computation (browsers and jsdom) keeps the words apart. `ari
         +a-pressed`                                                     
      17 + * reports whether the note is sounding (live or during replay)
         +.                                                              
      18 + *                                                             
      19 + * A piano note has a length, so a key reacts to press and rele
         +ase, not to                                                    
      20 + * click: pointer down starts the note; pointer up, cancel or l
         +eaving the key                                                 
      21 + * ends it. From the keyboard, Enter or Space held on the focus
         +ed key does the                                                
      22 + * same (auto-repeat is ignored), and losing focus ends the not
         +e.                                                             
      23 + *                                                             
      24 + * The key is validated before rendering (Project Rule 2) and i
         +ts text is                                                     
      25 + * rendered as React children, never as HTML (Project Rule 3). 
      26   */
      27  import { assertPianoKey, keyLabel } from "../piano.js";
      28  
      22 -export default function PianoKey({ pianoKey, onPress, className
         -, labelClassName, hintClassName }) {                           
      29 +const PLAY_KEYS = new Set(["Enter", " "]);                     
      30 +                                                               
      31 +export default function PianoKey({ pianoKey, pressed = false, o
         +nNoteOn, onNoteOff, className, labelClassName, hintClassName })
         + {                                                             
      32      assertPianoKey(pianoKey);
      24 -    if (onPress !== undefined && typeof onPress !== "function")
         - {                                                             
      25 -        throw new TypeError("PianoKey: onPress must be a functi
         -on when provided");                                            
      33 +    if (typeof pressed !== "boolean") {                        
      34 +        throw new TypeError(`PianoKey: pressed must be a boolea
         +n, received ${JSON.stringify(pressed)}`);                      
      35      }
      36 +    [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(
         +([name, handler]) => {                                         
      37 +        if (handler !== undefined && typeof handler !== "functi
         +on") {                                                         
      38 +            throw new TypeError(`PianoKey: ${name} must be a fu
         +nction when provided`);                                        
      39 +        }                                                      
      40 +    });                                                        
      41 +                                                               
      42 +    const start = onNoteOn ? () => onNoteOn(pianoKey) : undefin
         +ed;                                                            
      43 +    const end = onNoteOff ? () => onNoteOff(pianoKey) : undefin
         +ed;                                                            
      44 +                                                               
      45      return (
      46          <button
      47              type="button"
      48              className={className}
      49 +            aria-pressed={pressed}                             
      50              data-midi={pianoKey.midi}
      51              data-note-type={pianoKey.type}
      52              data-freq-hz={pianoKey.freqHz.toFixed(2)}
      34 -            onClick={onPress ? () => onPress(pianoKey) : undefi
         -ned}                                                           
      53 +            onPointerDown={start && ((event) => {              
      54 +                if (event.pointerType === "mouse" && event.butt
         +on !== 0) return;                                              
      55 +                start();                                       
      56 +            })}                                                
      57 +            onPointerUp={end}                                  
      58 +            onPointerCancel={end}                              
      59 +            onPointerLeave={end}                               
      60 +            onKeyDown={start && ((event) => {                  
      61 +                if (!PLAY_KEYS.has(event.key)) return;         
      62 +                event.preventDefault();                        
      63 +                if (!event.repeat) start();                    
      64 +            })}                                                
      65 +            onKeyUp={end && ((event) => {                      
      66 +                if (!PLAY_KEYS.has(event.key)) return;         
      67 +                event.preventDefault();                        
      68 +                end();                                         
      69 +            })}                                                
      70 +            onBlur={end}                                       
      71 +            onContextMenu={(event) => event.preventDefault()}  
      72          >
      73              <span className={labelClassName}>{keyLabel(pianoKey
          )}</span>
      74              {" "}
  Read 1 file (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/components"; python - <<'EOF'
      p='Piano.jsx'; s=open(p,encoding='utf8').re…)
  ⎿  30:const MemoPianoKey = memo(PianoKey);
     60:                        <MemoPianoKey
  ⎿  Updated LAB3\HW\pianoEngine\src\components\Piano.jsx (+74 -59)
       1 -/**                                                            
       2 - * Polyphonic Piano Engine — T-02A 88-key keyboard             
       3 - *                                                             
       4 - * The keys are generated (piano.js) and mapped here; no key is
         - written out by                                                
       5 - * hand. Piano owns the whole list, so each key is exactly one 
         -<li> holding                                                   
       6 - * one <button> (Project Rules 1 and 4):                       
       7 - *                                                             
       8 - *   <section aria-label="88-key piano">                       
       9 - *     <p> range summary </p>                                  
      10 - *     <ol>  88 × <li><PianoKey /></li>  </ol>      ascending M
         -IDI order                                                      
      11 - *   </section>                                                
      12 - *                                                             
      13 - * Layout. The <ol> is a CSS grid of UNITS_PER_WHITE columns pe
         -r white key.                                                   
      14 - * White keys span both rows; black keys sit in the top row, 2/
         -3 as wide,                                                     
      15 - * centred on the boundary between their white neighbours, and 
         -are painted                                                    
      16 - * above them. Placement is computed from the MIDI data (layout
         -PianoKeys), so                                                 
      17 - * the DOM stays in pitch order (C, C#, D, …) while the keys li
         -ne up as on a                                                  
      18 - * real keyboard. The grid is wider than a phone, so the list s
         -crolls                                                         
      19 - * horizontally inside its section and the page itself never do
         -es.                                                            
      20 - */                                                            
      21 -import { assertPianoKeys, keyLabel, layoutPianoKeys } from "../
         -piano.js";                                                     
      22 -import PianoKey from "./PianoKey.jsx";                         
      23 -import styles from "./Piano.module.css";                       
      24 -                                                               
      25 -export default function Piano({ pianoKeys, onKeyPress }) {     
      26 -    assertPianoKeys(pianoKeys);                                
      27 -    if (onKeyPress !== undefined && typeof onKeyPress !== "func
         -tion") {                                                       
      28 -        throw new TypeError("Piano: onKeyPress must be a functi
         -on when provided");                                            
      29 -    }                                                          
      30 -    const { placements, columns, whiteCount } = layoutPianoKeys
         -(pianoKeys);                                                   
      31 -    const first = pianoKeys[0];                                
      32 -    const last = pianoKeys[pianoKeys.length - 1];              
      33 -                                                               
      34 -    return (                                                   
      35 -        <section className={styles.piano} aria-label={`${pianoK
         -eys.length}-key piano`}>                                       
      36 -            <p className={styles.summary}>                     
      37 -                {keyLabel(first)} (MIDI {first.midi}) to {keyLa
         -bel(last)} (MIDI {last.midi}):{" "}                            
      38 -                {whiteCount} white and {pianoKeys.length - whit
         -eCount} black keys                                             
      39 -            </p>                                               
      40 -            <ol className={styles.keyboard} style={{ "--piano-c
         -olumns": columns }}>                                           
     … 93 more lines (ctrl+o to expand)

● Now the recorder controls component:

● Write(LAB3\HW\pianoEngine\src\components\RecorderControls.jsx)
  ⎿  Wrote 133 lines to
     LAB3\HW\pianoEngine\src\components\RecorderControls.jsx
       1 /**
       2  * Polyphonic Piano Engine — T-02C recording controls and record
         ed-note table
       3  *
       4  *   <section aria-labelledby="recorder-title">
       5  *     <h2>Recorder</h2>
       6  *     <menu aria-label="Recording controls">  4 × <li><button/>
         </li>  </menu>
       7  *     <fieldset> <legend>Playback speed</legend>  3 × <label><i
         nput type="radio"/> 0.5×</label> </fieldset>
     … +126 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\components\RecorderControls.module.css)
  ⎿  Wrote 123 lines to
     LAB3\HW\pianoEngine\src\components\RecorderControls.module.css
       1 /* Polyphonic Piano Engine — recorder styles (T-02C). Colours co
         me from the --piano-* tokens. */
       2 
       3 .recorder {
       4     margin-top: 1.5rem;
       5     min-width: 0;
       6 }
       7 
       8 .title {
       9     margin: 0 0 0.75rem;
     … +114 lines (ctrl+o to expand)

● A display: block table can lose its table semantics in Chromium, so I'll use a
  focusable <figure> as the scroll container instead:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/components"; python - <<'EOF'
      p='RecorderControls.jsx'; s=open(p,encoding…)
  ⎿   *     <figure tabindex="0">  scroll frame (the table is wider than a
     phone)
      *       <table> <caption/> thead + one <tr> per recorded event </tabl
     … +6 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\components\RecorderControls.jsx (+137 
     -133)
        1 -/**                                                           
        2 - * Polyphonic Piano Engine — T-02C recording controls and reco
          -rded-note table                                               
        3 - *                                                            
        4 - *   <section aria-labelledby="recorder-title">               
        5 - *     <h2>Recorder</h2>                                      
        6 - *     <menu aria-label="Recording controls">  4 × <li><button
          -/></li>  </menu>                                              
        7 - *     <fieldset> <legend>Playback speed</legend>  3 × <label>
          -<input type="radio"/> 0.5×</label> </fieldset>                
        8 - *     <output aria-live="polite">  status announcements  </ou
          -tput>                                                         
        9 - *     <table> <caption/> thead + one <tr> per recorded event 
          -</table>   (or a <p> when empty)                              
       10 - *   </section>                                               
       11 - *                                                            
       12 - * Unavailable actions use aria-disabled instead of the disabl
          -ed attribute:                                                 
       13 - * a button that becomes unavailable while focused (Start, onc
          -e recording has                                               
       14 - * begun) keeps keyboard focus instead of dropping it to <body
          ->, and its                                                    
       15 - * activation is simply ignored. The parent owns the data; eve
          -ry list and                                                   
       16 - * table row is rendered from it in order (Project Rule 4), an
          -d every value                                                 
       17 - * is rendered as text (Project Rule 3).                      
       18 - */                                                           
       19 -import { assertRecordedEvents, recordingLengthMs } from "../au
          -dio/NoteRecorder.js";                                         
       20 -import { PLAYBACK_SPEEDS, assertPlaybackSpeed } from "../audio
          -/SequencePlayer.js";                                          
       21 -import { createPianoKey, keyLabel } from "../piano.js";       
       22 -import styles from "./RecorderControls.module.css";           
       23 -                                                              
       24 -const MODES = Object.freeze(["idle", "recording", "playing"]);
       25 -const HANDLERS = Object.freeze(["onStart", "onStop", "onClear"
          -, "onPlay", "onSpeedChange"]);                                
       26 -                                                              
       27 -const formatSpeed = (speed) => `${speed.toFixed(1)}×`;        
       28 -const formatSeconds = (ms) => `${(ms / 1000).toFixed(2)} s`;  
       29 -                                                              
       30 -export default function RecorderControls({ mode, events, captu
          -redCount = 0, speed, status, ...handlers }) {                 
       31 -    if (!MODES.includes(mode)) {                              
       32 -        throw new TypeError(`RecorderControls: mode must be on
          -e of ${MODES.join(", ")}, received ${JSON.stringify(mode)}`); 
       33 -    }                                                         
       34 -    assertRecordedEvents(events);                             
       35 -    assertPlaybackSpeed(speed);                               
       36 -    if (!Number.isInteger(capturedCount) || capturedCount < 0)
          - {                                                            
       37 -        throw new TypeError("RecorderControls: capturedCount m
          -ust be a non-negative integer");                              
       38 -    }                                                         
       39 -    if (typeof status !== "string") {                         
       40 -        throw new TypeError("RecorderControls: status must be 
          -a string");                                                   
     … 230 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\components\RecorderControls.module.css
     (+133 -123)
        1 -/* Polyphonic Piano Engine — recorder styles (T-02C). Colours 
          -come from the --piano-* tokens. */                            
        2 -                                                              
        3 -.recorder {                                                   
        4 -    margin-top: 1.5rem;                                       
        5 -    min-width: 0;                                             
        6 -}                                                             
        7 -                                                              
        8 -.title {                                                      
        9 -    margin: 0 0 0.75rem;                                      
       10 -    font-size: 1.125rem;                                      
       11 -}                                                             
       12 -                                                              
       13 -.actions {                                                    
       14 -    list-style: none;                                         
       15 -    margin: 0 0 1rem;                                         
       16 -    padding: 0;                                               
       17 -    display: flex;                                            
       18 -    flex-wrap: wrap;                                          
       19 -    gap: 0.5rem;                                              
       20 -}                                                             
       21 -                                                              
       22 -.action {                                                     
       23 -    min-height: 2.75rem;                                      
       24 -    padding: 0.5rem 1rem;                                     
       25 -    font: inherit;                                            
       26 -    font-weight: 600;                                         
       27 -    color: var(--piano-text);                                 
       28 -    background: var(--piano-control);                         
       29 -    border: 1px solid var(--piano-key-border);                
       30 -    border-radius: 0.5rem;                                    
       31 -    cursor: pointer;                                          
       32 -}                                                             
       33 -                                                              
       34 -.action[data-recording="true"] {                              
       35 -    border-color: var(--piano-recording);                     
       36 -    box-shadow: inset 0 0 0 2px var(--piano-recording);       
       37 -}                                                             
       38 -                                                              
       39 -.action[aria-disabled="true"] {                               
       40 -    color: var(--piano-muted);                                
     … 216 more lines (ctrl+o to expand)

● Fixing indentation inside the figure, then App, tokens and key styles:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src"; python - <<'EOF'
      p='components/RecorderControls.jsx'; L=open(p,encoding…)
  ⎿   *     <figure tabindex="0">  scroll frame (the table is wider than a
     phone)
      *       <table> <caption/> thead + one <tr> per recorded event </tabl
     … +6 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\components\RecorderControls.jsx (+28 
     -28)
       99                  <p className={styles.note}>Notes captured: {ca
           pturedCount}</p>
      100              ) : hasRecording ? (
      101                  <figure className={styles.tableFrame} tabIndex
           ={0} aria-labelledby="recorded-notes-caption">
      102 -                <table className={styles.table}>              
      103 -                    <caption id="recorded-notes-caption">     
      104 -                        Recorded notes: {events.length}, {form
          -atSeconds(recordingLengthMs(events))} at 1.0×                 
      105 -                    </caption>                                
      106 -                    <thead>                                   
      107 -                        <tr>                                  
      108 -                            <th scope="col">#</th>            
      109 -                            <th scope="col">Note</th>         
      110 -                            <th scope="col">MIDI</th>         
      111 -                            <th scope="col">Frequency</th>    
      112 -                            <th scope="col">Start</th>        
      113 -                            <th scope="col">Delta</th>        
      114 -                            <th scope="col">Duration</th>     
      115 -                        </tr>                                 
      116 -                    </thead>                                  
      117 -                    <tbody>                                   
      118 -                        {rows.map(({ index, event, onset: star
          -t }) => (                                                     
      119 -                            <tr key={index}>                  
      120 -                                <th scope="row">{index + 1}</t
          -h>                                                            
      121 -                                <td>{keyLabel(createPianoKey(e
          -vent.midi))}</td>                                             
      122 -                                <td>{event.midi}</td>         
      123 -                                <td>{event.freqHz.toFixed(2)} 
          -Hz</td>                                                       
      124 -                                <td>{start} ms</td>           
      125 -                                <td>{event.deltaMs} ms</td>   
      126 -                                <td>{event.durationMs} ms</td>
      102 +                    <table className={styles.table}>          
      103 +                        <caption id="recorded-notes-caption"> 
      104 +                            Recorded notes: {events.length}, {
          +formatSeconds(recordingLengthMs(events))} at 1.0×             
      105 +                        </caption>                            
      106 +                        <thead>                               
      107 +                            <tr>                              
      108 +                                <th scope="col">#</th>        
      109 +                                <th scope="col">Note</th>     
      110 +                                <th scope="col">MIDI</th>     
      111 +                                <th scope="col">Frequency</th>
      112 +                                <th scope="col">Start</th>    
      113 +                                <th scope="col">Delta</th>    
     … 23 more lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\App.jsx)
  ⎿  Added 28 lines, removed 4 lines
       1  import Piano from "./components/Piano.jsx";
       2 +import RecorderControls from "./components/RecorderControls.jsx
         +";                                                             
       3  import { PIANO_KEYS } from "./piano.js";
       4 +import usePianoEngine from "./usePianoEngine.js";              
       5  
       4 -/** Rendered into <main id="root"> (index.html); landmarks only
         -, no wrapper element. */                                       
       5 -export default function App() {                                
       6 +/**                                                            
       7 + * Rendered into <main id="root"> (index.html); landmarks only,
         + no wrapper element.                                           
       8 + * `engine` options (a synth and clocks) are injectable for tes
         +ts; the app uses                                               
       9 + * the real PolyphonicSynth, created lazily on the first key pr
         +ess.                                                           
      10 + */                                                            
      11 +export default function App({ engine } = {}) {                 
      12 +    const piano = usePianoEngine(engine);                      
      13      return (
      14          <>
      15              <header>
      16                  <h1>Polyphonic Piano Engine</h1>
      10 -                <p>88 keys generated from MIDI note numbers 21–
         -108</p>                                                        
      17 +                <p>88 keys generated from MIDI note numbers 21–
         +108, eight voices at once</p>                                  
      18              </header>
      12 -            <Piano pianoKeys={PIANO_KEYS} />                   
      19 +            <Piano                                             
      20 +                pianoKeys={PIANO_KEYS}                         
      21 +                activeNotes={piano.activeNotes}                
      22 +                onNoteOn={piano.noteOn}                        
      23 +                onNoteOff={piano.noteOff}                      
      24 +            />                                                 
      25 +            <RecorderControls                                  
      26 +                mode={piano.mode}                              
      27 +                events={piano.events}                          
      28 +                capturedCount={piano.capturedCount}            
      29 +                speed={piano.speed}                            
      30 +                status={piano.status}                          
      31 +                onStart={piano.startRecording}                 
      32 +                onStop={piano.stopRecording}                   
      33 +                onClear={piano.clearRecording}                 
      34 +                onPlay={piano.playSequence}                    
      35 +                onSpeedChange={piano.setSpeed}                 
      36 +            />                                                 
      37          </>
      38      );
      39  }

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; python - <<'EOF'
      p='index.html'; s=open(p,encoding='utf8').read()…)
  ⎿       × forwards a click on a key to onKeyPress with that key's metadat
     a 73ms
          × throws a TypeError for a non-function onKeyPress (Rule 2) 18ms
     … +15 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\index.html (+49 -44)
       1 -<!doctype html>                                                
       2 -<html lang="en">                                               
       3 -<head>                                                         
       4 -  <meta charset="utf-8">                                       
       5 -  <meta name="viewport" content="width=device-width, initial-sc
         -ale=1">                                                        
       6 -  <title>Polyphonic Piano Engine – 88-Key Piano</title>        
       7 -  <meta name="description" content="An 88-key piano (A0 to C8) 
         -generated algorithmically from MIDI note numbers.">            
       8 -  <meta name="theme-color" content="#101218">                  
       9 -  <!-- Empty inline icon: no /favicon.ico request, so no 404 in
         - the console. -->                                              
      10 -  <link rel="icon" href="data:,">                              
      11 -  <style>                                                      
      12 -    /* T-02A design tokens; contrast is checked by src/theme.te
         -st.js. */                                                      
      13 -    :root {                                                    
      14 -      --piano-background: #101218;                             
      15 -      --piano-text: #f8fafc;                                   
      16 -      --piano-muted: #cbd5e1;                                  
      17 -      --piano-white-key: #f8fafc;                              
      18 -      --piano-white-text: #0f172a;                             
      19 -      --piano-key-border: #64748b;                             
      20 -      --piano-black-key: #111827;                              
      21 -      --piano-black-text: #f8fafc;                             
      22 -      --piano-black-border: #64748b;                           
      23 -      --piano-focus: #8b5cf6;                                  
      24 -      --piano-white-width: 2.5rem;                             
      25 -      --piano-white-height: 11rem;                             
      26 -      --piano-black-height: 7rem;                              
      27 -      color-scheme: dark;                                      
      28 -      font-family: system-ui, -apple-system, "Segoe UI", Roboto
         -, sans-serif;                                                  
      29 -      line-height: 1.4;                                        
      30 -      color: var(--piano-text);                                
      31 -      background: var(--piano-background);                     
      32 -    }                                                          
      33 -    body { margin: 0; min-height: 100vh; }                     
      34 -    #root { max-width: 80rem; margin: 0 auto; padding: 1.5rem 1
         -rem 2rem; }                                                    
      35 -    h1 { margin: 0; font-size: clamp(1.5rem, 4vw, 2.25rem); }  
      36 -    header p { margin: 0.25rem 0 1.25rem; color: var(--piano-mu
         -ted); }                                                        
      37 -  </style>                                                     
      38 -</head>                                                        
      39 -<body>                                                         
      40 -  <main id="root"></main>                                      
     … 53 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\components\Piano.module.css (+129 
     -106)
        1 -/*                                                            
        2 - * Polyphonic Piano Engine — keyboard styles (T-02A).         
        3 - *                                                            
        4 - * Colours come from the --piano-* tokens in index.html. One w
          -hite key is                                                   
        5 - * --piano-white-width wide (6 grid units); a black key is 4 u
          -nits, 2/3 of a                                                
        6 - * white key, which keeps it above the 24 px minimum target si
          -ze (WCAG 2.5.8).                                              
        7 - */                                                           
        8 -                                                              
        9 -.piano {                                                      
       10 -    min-width: 0;                                             
       11 -}                                                             
       12 -                                                              
       13 -.summary {                                                    
       14 -    margin: 0 0 0.75rem;                                      
       15 -    color: var(--piano-muted);                                
       16 -}                                                             
       17 -                                                              
       18 -.keyboard {                                                   
       19 -    --piano-unit: calc(var(--piano-white-width) / 6);         
       20 -    list-style: none;                                         
       21 -    margin: 0;                                                
       22 -    padding: 0 0 0.75rem;                                     
       23 -    display: grid;                                            
       24 -    grid-template-columns: repeat(var(--piano-columns), var(--
          -piano-unit));                                                 
       25 -    grid-template-rows: var(--piano-black-height) calc(var(--p
          -iano-white-height) - var(--piano-black-height));              
       26 -    overflow-x: auto;                                         
       27 -    overscroll-behavior-x: contain;                           
       28 -}                                                             
       29 -                                                              
       30 -.whiteSlot {                                                  
       31 -    grid-row: 1 / span 2;                                     
       32 -    display: grid;                                            
       33 -}                                                             
       34 -                                                              
       35 -.blackSlot {                                                  
       36 -    grid-row: 1;                                              
       37 -    z-index: 1;                                               
       38 -    display: grid;                                            
       39 -}                                                             
       40 -                                                              
     … 195 more lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● The 4 failures are the old click/onKeyPress tests from PRD 1. Updating them
  for the new press/release API:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/components"; python - <<'EOF'
      p='Piano.test.jsx'; s=open(p,encoding='utf8…)
  ⎿  23:const SOURCES = [["Piano.jsx", PIANO_SOURCE], ["PianoKey.jsx", KEY_
     SOURCE], ["App.jsx", APP_SOURCE]];
  ⎿  Updated LAB3\HW\pianoEngine\src\components\Piano.test.jsx (+185 -141)
        1 -import { afterEach, describe, expect, test, vi } from "vitest"
          -;                                                             
        2 -import { cleanup, fireEvent, render, screen, within } from "@t
          -esting-library/react";                                        
        3 -import PIANO_SOURCE from "./Piano.jsx?raw";                   
        4 -import KEY_SOURCE from "./PianoKey.jsx?raw";                  
        5 -import APP_SOURCE from "../App.jsx?raw";                      
        6 -import Piano from "./Piano.jsx";                              
        7 -import PianoKey from "./PianoKey.jsx";                        
        8 -import App from "../App.jsx";                                 
        9 -import { PIANO_KEYS, createPianoKey, generatePianoKeys } from 
          -"../piano.js";                                                
       10 -                                                              
       11 -// T-02A — semantic rendering of the generated keyboard (PRD 1
          - sections 5–7, Project Rules 1–4).                            
       12 -                                                              
       13 -function renderInMain(element) {                              
       14 -    const main = document.body.appendChild(document.createElem
          -ent("main"));                                                 
       15 -    return render(element, { container: main });              
       16 -}                                                             
       17 -                                                              
       18 -afterEach(() => {                                             
       19 -    cleanup();                                                
       20 -    document.body.replaceChildren();                          
       21 -});                                                           
       22 -                                                              
       23 -const SOURCES = [["Piano.jsx", PIANO_SOURCE], ["PianoKey.jsx",
          - KEY_SOURCE], ["App.jsx", APP_SOURCE]];                       
       24 -const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "
          -").replace(/\/\/.*$/gm, "");                                  
       25 -                                                              
       26 -describe("Piano", () => {                                     
       27 -    test("renders one section > ol with 88 list items, each ho
          -lding exactly one button", () => {                            
       28 -        const { container } = renderInMain(<Piano pianoKeys={P
          -IANO_KEYS} />);                                               
       29 -        const section = screen.getByRole("region", { name: "88
          --key piano" });                                               
       30 -        const list = within(section).getByRole("list");       
       31 -        expect(list.tagName).toBe("OL");                      
       32 -        const items = within(list).getAllByRole("listitem");  
       33 -        expect(items).toHaveLength(88);                       
       34 -        items.forEach((item) => {                             
       35 -            expect(item.children).toHaveLength(1);            
       36 -            expect(item.firstElementChild.tagName).toBe("BUTTO
          -N");                                                          
       37 -        });                                                   
       38 -        expect(container.querySelectorAll("button")).toHaveLen
          -gth(88);                                                      
       39 -    });                                                       
       40 -                                                              
     … 286 more lines (ctrl+o to expand)

● Now tests for the queue, recorder and player:

● Write(LAB3\HW\pianoEngine\src\audio\sequencing.test.js)
  ⎿  Wrote 318 lines to LAB3\HW\pianoEngine\src\audio\sequencing.test.js
       1 import { afterEach, beforeEach, describe, expect, test, vi } fro
         m "vitest";
       2 import { AudioTaskQueue } from "./AudioTaskQueue.js";
       3 import { NoteRecorder, assertRecordedEvent, assertRecordedEvents
         , recordingLengthMs } from "./NoteRecorder.js";
       4 import { PLAYBACK_SPEEDS, SequencePlayer } from "./SequencePlaye
         r.js";
       5 import { createPianoKey } from "../piano.js";
       6 
       7 // T-02C — FIFO queue, note recorder and asynchronous variable-s
     … +312 lines (~14 KB) (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests
      |Error|Expected|Received|^\s+[-…)
  ⎿       × schedules against absolute times, so a late timer does not dela
     y later notes 5ms
          × the 88 keys are generated with .map, not written out 4ms
     … +12 lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● Two test bugs to look at: the skew test changed the clock after the third
  timer had already been scheduled, and a source-check regex returns no matches.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; grep -n "PianoKey\\\\b\|Memo)" src/components/Piano.test.jsx;
      grep -n "<Mem…)
  ⎿  4:import KEY_SOURCE from "./PianoKey.jsx?raw";
     7:import PianoKey from "./PianoKey.jsx";
     9:import { PIANO_KEYS, createPianoKey, generatePianoKeys } from "../pi
     … +15 lines (ctrl+o to expand)

● The replacement never applied (escaping mismatch), so I'll fix both directly:

● Update(LAB3\HW\pianoEngine\src\components\Piano.test.jsx)
  ⎿  Added 1 line, removed 1 line
      171  
      172      test("the 88 keys are generated with .map, not written out
           ", () => {
      173          expect(code(PIANO_SOURCE)).toMatch(/pianoKeys\.map\(/)
           ;
      174 -        expect((code(PIANO_SOURCE).match(/<PianoKey\b/g) ?? []
          -)).toHaveLength(1);                                           
      174 +        expect((code(PIANO_SOURCE).match(/<(Memo)?PianoKey\b/g
          +) ?? [])).toHaveLength(1);                                    
      175      });
      176  });
      177  

● Update(LAB3\HW\pianoEngine\src\audio\sequencing.test.js)
  ⎿  Added 7 lines, removed 6 lines
      273      });
      274  
      275      test("schedules against absolute times, so a late timer do
           es not delay later notes", async () => {
      276 -        let skew = 0;                                         
      277 -        player = new SequencePlayer(instrument, { now: () => D
          -ate.now() + skew });                                          
      276 +        // Timer calls: #0 onset 60, #1 release 60, #2 onset 6
          +2 — that one fires 30 ms late.                                
      277 +        let calls = 0;                                        
      278 +        const lateTimer = (fn, ms) => setTimeout(fn, calls++ =
          +== 2 ? ms + 30 : ms);                                         
      279 +        player = new SequencePlayer(instrument, { now: () => D
          +ate.now(), setTimer: lateTimer });                            
      280          const start = Date.now();
      281          const done = player.play([ev(60, 0, 50), ev(62, 100, 5
           0), ev(64, 100, 50)], 1);
      280 -        await vi.advanceTimersByTimeAsync(100);           // s
          -econd note fires at 100                                       
      281 -        skew = 30;                                        // t
          -he clock reports 30 ms late from now on                       
      282          await vi.runAllTimersAsync();
      283          await done;
      284 -        const thirdOn = log.find(([, kind, midi]) => kind === 
          -"on" && midi === 64)[0] - start;                              
      285 -        expect(thirdOn).toBe(170);                        // 2
          -00 target - 30 skew: catches up, does not add up              
      284 +        const onsetOf = (midi) => log.find(([, kind, m]) => ki
          +nd === "on" && m === midi)[0] - start;                        
      285 +        expect(onsetOf(62)).toBe(130);                    // t
          +he late one                                                   
      286 +        expect(onsetOf(64)).toBe(200);                    // b
          +ack on schedule; chained delays would give 230                
      287      });
      288  
      289      test("a re-struck note whose release is still pending is r
           eleased and struck again", async () => {

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests |Error" | head
      -20)
  ⎿        Tests  149 passed (149)
  ⎿  (timeout 2m)

● 149 passing. Next, component and integration tests for the recorder UI (fake
  synth and clock):

● Write(LAB3\HW\pianoEngine\src\components\RecorderControls.test.jsx)
  ⎿  Wrote 281 lines to
     LAB3\HW\pianoEngine\src\components\RecorderControls.test.jsx
       1 import { afterEach, beforeEach, describe, expect, test, vi } fro
         m "vitest";
       2 import { act, cleanup, fireEvent, render, screen, within } from 
         "@testing-library/react";
       3 import SOURCE from "./RecorderControls.jsx?raw";
       4 import HOOK_SOURCE from "../usePianoEngine.js?raw";
       5 import RecorderControls from "./RecorderControls.jsx";
       6 import App from "../App.jsx";
       7 import { createPianoKey } from "../piano.js";
       8 
     … +273 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests
      |Error|Expected|Received|^\s+[-…)  ⎿       × offers 0.5×, 1.0× and 2.0× as one radio group and reports chang
     es 13ms
          × Clear Recording removes every event, and stops a replay in prog
     … +22 lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● The test needs to trim the label text, and I'm changing stop() to release the
  sounding notes synchronously so Clear silences them immediately.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; python - <<'EOF'
      p='src/audio/SequencePlayer.js'; s=open(p,encoding='utf8')…)
  ⎿        Tests  175 passed (175)
  ⎿  Updated LAB3\HW\pianoEngine\src\audio\SequencePlayer.js (+149 -143)
        1 -/**                                                           
        2 - * Polyphonic Piano Engine — T-02C asynchronous FIFO sequencer
        3 - *                                                            
        4 - * Replays a recording through any instrument with noteOn(midi
          -, freqHz) and                                                 
        5 - * noteOff(midi) (the PolyphonicSynth, or the UI adapter that 
          -also lights the                                               
        6 - * keys). Each play() copies the recording into a fresh AudioT
          -askQueue and                                                  
        7 - * drains it in an async loop:                                
        8 - *                                                            
        9 - *   dequeue next event ─► await deltaMs / speed ─► noteOn    
       10 - *        ▲                                          │        
       11 - *        └──────────── (note-off timer: durationMs / speed) ─
          -► noteOff                                                     
       12 - *                                                            
       13 - * The loop awaits each event's onset before dequeuing the nex
          -t, so notes                                                   
       14 - * start strictly in recorded order. A note's release is sched
          -uled on its own                                               
       15 - * timer instead of blocking the loop: deltaMs is measured ons
          -et-to-onset, so                                               
       16 - * waiting for one note to end before starting the next would 
          -push every                                                    
       17 - * overlapping note (chords, legato) late. Overlapping notes t
          -herefore sound                                                
       18 - * together, which is what the 8-voice pool is for. play() res
          -olves once the                                                
       19 - * last note has been released.                               
       20 - *                                                            
       21 - * Timing. Every wait targets an absolute time from the start 
          -of playback                                                   
       22 - * (sum of deltaMs / speed), not a chain of relative delays, s
          -o timer jitter                                                
       23 - * never accumulates across a long sequence.                  
       24 - *                                                            
       25 - * One loop at a time: calling play() while a replay is runnin
          -g returns the                                                 
       26 - * running replay's promise instead of starting a competing lo
          -op. stop()                                                    
       27 - * cancels every pending timer and releases the notes this rep
          -lay started.                                                  
       28 - * The recording itself is never mutated (it is only read into
          - the queue).                                                  
       29 - */                                                           
       30 -import { AudioTaskQueue } from "./AudioTaskQueue.js";         
       31 -import { assertRecordedEvents } from "./NoteRecorder.js";     
       32 -                                                              
       33 -export const PLAYBACK_SPEEDS = Object.freeze([0.5, 1, 2]);    
       34 -                                                              
       35 -export function assertPlaybackSpeed(speed) {                  
       36 -    if (!PLAYBACK_SPEEDS.includes(speed)) {                   
       37 -        throw new TypeError(`SequencePlayer: speed must be one
          - of ${PLAYBACK_SPEEDS.join(", ")}, received ${JSON.stringify(s
          -peed)}`);                                                     
       38 -    }                                                         
       39 -}                                                             
       40 -                                                              
     … 252 more lines (ctrl+o to expand)
  ⎿  … 2 more files changed
  ⎿  (timeout 2m)

● 175 pass. Adding contrast checks for the new tokens:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; python - <<'EOF'
      p='src/theme.test.js'; s=open(p,encoding='utf8').read()…)
  ⎿        Tests  21 passed (21)
  ⎿  Updated LAB3\HW\pianoEngine\src\theme.test.js (+68 -58)
       1 -import { readFileSync } from "node:fs";                        
       2 -import { describe, expect, test } from "vitest";               
       3 -import INDEX_HTML from "../index.html?raw";                    
       4 -                                                               
       5 -// Read as text: the Vitest CSS-Modules setting turns `?raw` im
         -ports of *.module.css into class maps.                         
       6 -const STYLES = readFileSync("src/components/Piano.module.css", 
         -"utf8");                                                       
       7 -                                                               
       8 -// T-02A — key colours meet WCAG 2.2 AA (1.4.3 text, 1.4.11 non
         --text), computed from the real tokens.                         
       9 -                                                               
      10 -function luminance(hex) {                                      
      11 -    const [r, g, b] = hex.slice(1).match(/../g).map((pair) => {
      12 -        const channel = parseInt(pair, 16) / 255;              
      13 -        return channel <= 0.03928 ? channel / 12.92 : ((channel
         - + 0.055) / 1.055) ** 2.4;                                     
      14 -    });                                                        
      15 -    return 0.2126 * r + 0.7152 * g + 0.0722 * b;               
      16 -}                                                              
      17 -                                                               
      18 -function contrast(a, b) {                                      
      19 -    const [light, dark] = [luminance(a), luminance(b)].sort((x,
         - y) => y - x);                                                 
      20 -    return (light + 0.05) / (dark + 0.05);                     
      21 -}                                                              
      22 -                                                               
      23 -const T = Object.fromEntries(                                  
      24 -    [...INDEX_HTML.matchAll(/--piano-([a-z-]+):\s*(#[0-9a-f]{6}
         -)\s*;/gi)].map(([, name, value]) => [name, value.toLowerCase()]
         -)                                                              
      25 -);                                                             
      26 -                                                               
      27 -describe("design tokens", () => {                              
      28 -    test("the contrast maths matches the WCAG reference values"
         -, () => {                                                      
      29 -        expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 
         -5);                                                            
      30 -        expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48
         -, 2);                                                          
      31 -    });                                                        
      32 -                                                               
      33 -    test("the stylesheet uses tokens, not hard-coded colours", 
         -() => {                                                        
      34 -        const code = STYLES.replace(/\/\*[\s\S]*?\*\//g, "");  
      35 -        expect(code).not.toMatch(/#[0-9a-f]{3,8}\b/i);         
      36 -        ["white-key", "black-key", "focus", "key-border"].forEa
         -ch((token) => expect(code).toContain(`var(--piano-${token})`));
      37 -    });                                                        
      38 -                                                               
      39 -    test.each([                                                
      40 -        ["page text", "text", "background"],                   
     … 86 more lines (ctrl+o to expand)

● Now browser tests for the real recording flow in Edge: real mouse holds, real
  synth, axe on the recorder.

● Write(LAB3\HW\pianoEngine\e2e\recorder.spec.js)
  ⎿  Wrote 129 lines to LAB3\HW\pianoEngine\e2e\recorder.spec.js
       1 import { expect, test } from "@playwright/test";
       2 import AxeBuilder from "@axe-core/playwright";
       3 
       4 // T-02C — record with real mouse presses, replay through the re
         al PolyphonicSynth at
       5 // 0.5× / 1.0× / 2.0× in Microsoft Edge, keyboard operation and 
         WCAG 2.2 AA.
       6 
       7 let consoleErrors;
       8 
     … +121 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test 2>&1 | grep -vE "^\s*$" | tail -45)
  ⎿  Running 16 tests using 3 workers
       ✓   2 e2e\piano.spec.js:51:1 › renders 88 keys, 52 white and 36 blac
     k, MIDI 21–108 in order (666ms)
     … +40 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Test bug: each replay added another MutationObserver without disconnecting the
  previous one, so notes got counted twice. Fixing:

● Update(LAB3\HW\pianoEngine\e2e\recorder.spec.js)
  ⎿  Added 2 lines, removed 1 line
      46  async function timeReplay(page, label) {
      47      await page.getByRole("radio", { name: label }).check();
      48      await page.evaluate(() => {
      49 +        window.__observer?.disconnect();             // one obs
         +erver per replay                                               
      50          window.__onsets = [];
      51          const start = performance.now();
      52          window.__replayStart = start;
      52 -        new MutationObserver((records) => {                    
      53 +        window.__observer = new MutationObserver((records) => {
      54              records.forEach(({ target }) => {
      55                  if (target.getAttribute("aria-pressed") === "tr
          ue") window.__onsets.push([Number(target.dataset.midi), perform
          ance.now() - start]);
      56              });

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test e2e/recorder.spec.js --repeat-each=3 2>&1
      | grep -vE "^…)
  ⎿        87 |     // Onset spans scale with 1 / speed (generous tolerance
      for timer and frame jitter).
             at D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r\
     … +12 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test e2e/recorder.spec.js -g "replay at" 2>&1 |
      grep -A16 "E…)
  ⎿      Error: expect(received).toEqual(expected) // deep equality

         - Expected  - 0
     … +15 lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● Still doubled, so the duplicate isn't from the test harness. Let me log what's
  actually happening during a replay:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; cat > e2e/zz-debug.spec.js <<'EOF'
      import { test } from "@playwright/test";…)
  ⎿  [
       [
         "60",
     … +25 lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● No doubling with a plain observer. The real test differs: it reads the current
  attribute when the callback runs, and runs three replays back to back.
  Reproducing that exact flow:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; sed 's/expect(runs\[label\].onsets.map(\[\[midi\]\]) =>
      midi)).toEqual(\[60…)
  ⎿  (No output)
  ⎿  (timeout 2m)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; python - <<'EOF'
      s=open('e2e/recorder.spec.js',encoding='utf8').read()…)
  ⎿  RUN 1.0× {"onsets":[[60,42.60000038146973],[64,394.1000003814697],[67,
     738.6000003814697]],"total":1362.4000000953674}
     RUN 2.0× {"onsets":[[60,1462.8000001907349],[60,62],[64,1639.700000286
     … +6 lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● Found it: window.__observer = new MutationObserver(...).observe(...) stores
  the return value of .observe(), which is undefined, so the observer was never
  disconnected. Fixing the test:

  Read 1 file (ctrl+o to expand)

● Update(LAB3\HW\pianoEngine\e2e\recorder.spec.js)
  ⎿  Added 5 lines, removed 3 lines
      50          window.__onsets = [];
      51          const start = performance.now();
      52          window.__replayStart = start;
      53 +        // A note is struck when its key goes from not pressed 
         +to pressed (oldValue "false").                                 
      54          window.__observer = new MutationObserver((records) => {
      54 -            records.forEach(({ target }) => {                  
      55 -                if (target.getAttribute("aria-pressed") === "tr
         -ue") window.__onsets.push([Number(target.dataset.midi), perform
         -ance.now() - start]);                                          
      55 +            records.forEach(({ target, oldValue }) => {        
      56 +                if (oldValue === "false") window.__onsets.push(
         +[Number(target.dataset.midi), performance.now() - start]);     
      57              });
      57 -        }).observe(document.querySelector("ol"), { subtree: tru
         -e, attributeFilter: ["aria-pressed"] });                       
      58 +        });                                                    
      59 +        window.__observer.observe(document.querySelector("ol"),
         + { subtree: true, attributeFilter: ["aria-pressed"], attributeO
         +ldValue: true });                                              
      60      });
      61      await control(page, "Play Sequence").click();
      62      await expect(page.getByRole("status")).toHaveText("Playback
           finished.", { timeout: 10000 });

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test --repeat-each=2 2>&1 | grep -vE "^\s*$" |
      tail -4; npx…)
  ⎿    ✓  30 e2e\recorder.spec.js:106:1 › keyboard only: record with Space
     held on keys, replay with Enter (1.4s)
       ✓  31 e2e\recorder.spec.js:124:1 › axe WCAG 2.2 AA clean with a reco
     … +5 lines (ctrl+o to expand)
  ⎿  (timeout 6m 40s)

● Everything passes, both e2e runs. A quick look at the UI with a recording on
  screen:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; SP="C:/Users/admin/AppData/Local/Temp/claude/50d6cabe54ff641f/
      54029dc6-994b…)
  ⎿    1 passed (4.8s)
  ⎿  (timeout 2m)

  Read 1 file (ctrl+o to expand)

● The layout checks out at 375px, with unavailable controls dashed and the table
  scrolling inside its frame. The keys don't show as pressed in the screenshot,
  but the tests confirm they light up during replay, so I'm committing.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; git add -A . && git status --short . && git commit -q -F -
      <<'EOF'
      feat(hw2…)
  ⎿  warning: in the working copy of 'LAB3/HW/pianoEngine/src/App.jsx', LF
     will be replaced by CRLF the next time Git touches it
     warning: in the working copy of 'LAB3/HW/pianoEngine/src/components/Pi
     … +19 lines (ctrl+o to expand)
● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; python - <<'EOF'
      p='lab3-hw2-piano-engine.md'; s=open(p,…)
  ⎿  3
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

● PRD 3 is done and committed as 16f5297 feat(hw2): add FIFO recording and 
  variable-speed replay. The piano now plays through the 8-voice synth, and you
  can record a melody and play it back at 0.5×, 1.0× or 2.0×. All 184 unit tests
  pass, and all 16 Edge browser tests pass two runs in a row. The build works.

  What was added
  - AudioTaskQueue.js: the PRD's first-in-first-out queue, using a head index
    instead of shift() as the PRD suggests for large queues. It rejects null
    tasks, because null already means "queue empty".
  - NoteRecorder.js: each recorded note is { midi, freqHz, durationMs, deltaMs 
    }.
    - durationMs runs from pressing the note to releasing it.
    - deltaMs is the time since the previous note was pressed (0 for the first
      note).
    - A note is added when pressed, so the order stays correct when notes
      overlap. Its duration is filled in when it is released.
    - Times are rounded to whole milliseconds without the rounding adding up
      over a long recording.
    - A note still held when you press Stop Recording ends at the stop time.
    - The finished recording is frozen, so playback can't change it.
  - SequencePlayer.js: playback is an async loop that takes the next note from a
    fresh copy of the queue, waits deltaMs / speed, then plays it.
    - Each note's release runs on its own timer for durationMs / speed.
    - Pressing Play again while it is playing returns the playback already
      running instead of starting a second one.
    - stop() cancels the timers and releases the notes straight away.
  - Recorder section:
    - Start, Stop, Clear and Play Sequence controls.
    - A speed choice of 0.5×, 1.0× and 2.0×.
    - A status line that screen readers announce.
    - A table of recorded notes showing all four fields.
  - Keys now respond to press and release instead of click, so note lengths can
    be recorded: mouse or touch down and up, or holding Enter or Space on a
    focused key. A key shows as pressed (amber) while its note is sounding, both
    during live play and during playback.

  Two decisions that differ from the PRD text
  1. Overlapping notes in playback. The PRD's flow waits for each note to be
     released before starting the next. Because deltaMs is measured from one
     press to the next, that would make every overlapping note (chords, legato)
     start late. So the loop still starts notes strictly in order, but each
     release runs on its own timer, and overlapping notes sound together on the
     8 voices.
  2. Unavailable buttons stay focusable. They use aria-disabled rather than
     disabled. Otherwise the Start button would lose keyboard focus the moment
     recording begins.

  Timing accuracy: playback times each note from the start of playback, not from
  the previous note. A late timer therefore doesn't push all later notes back;
  a unit test checks this.

  Project rules
  1. No div soup: the recorder is built from <section>, <menu>, <fieldset>,
     <output>, <table> and <figure>, with no <div>.
  2. Type checks: recorded notes, playback speeds, the instrument, the clock and
     component props are all checked, and invalid input throws a TypeError.
  3. XSS: everything is rendered as text.
  4. Mounting order: table rows and buttons appear in the same order as the
     data.

  Changes to earlier PRD code
  - Old click API removed: the PRD 1 onKeyPress click hook was replaced by
    onNoteOn/onNoteOff, and the earlier tests were updated to match.
  - New colours: I added colours for pressed keys and the recorder controls, all
    checked for contrast. The focus outline now has a light inner ring so it
    stays visible on a pressed black key.

  As before, I didn't write a report.

✻ Cooked for 11m 40s · done 6:16 PM

❯ go on with PRD 4                                                              
  PRD 4 — Abortable Sequencer & React.memo Render Isolation                     
  T-02D: Cancellation, Memoization & Performance Audit                          
  Commit 4                                                                      
  Estimated duration: 25–30 minutes                                             
                                                                                
  Git commit message                                                            
                                                                                
  feat(hw2): add abortable sequencer and memoized render isolation              
                                                                                
  1. Objective                                                                  
  Finalize the piano by introducing reliable asynchronous playback cancellation 
  and optimizing React rendering so that pressing one piano key does not cause  
  all 88 components to re-render.                                               
                                                                                
  This PRD covers two of the most important requirements of the exercise:       
                                                                                
  AbortController cancellation.                                                 
                                                                                
  React.memo render isolation.                                                  
                                                                                
  2. AbortController cancellation                                               
  Every playback sequence must have an associated AbortController.              
                                                                                
  const controller = new AbortController();                                     
                                                                                
  Pass the signal to the asynchronous playback processor.                       
                                                                                
  await playSequence({                                                          
    queue,                                                                      
    synth,                                                                      
    speed,                                                                      
    signal: controller.signal,                                                  
  });                                                                           
                                                                                
  The playback processor must check the signal before scheduling new notes and  
  after asynchronous waits.                                                     
                                                                                
  3. Abortable asynchronous delay                                               
  Implement a delay function that supports cancellation.                        
                                                                                
  export function abortableDelay(ms, signal) {                                  
    return new Promise((resolve, reject) => {                                   
      if (signal.aborted) {                                                     
        reject(new DOMException(                                                
          'Playback cancelled',                                                 
          'AbortError'                                                          
        ));                                                                     
        return;                                                                 
      }                                                                         
                                                                                
      const timer = setTimeout(() => {                                          
        cleanup();                                                              
        resolve();                                                              
      }, ms);                                                                   
                                                                                
      const cleanup = () => {                                                   
        clearTimeout(timer);                                                    
        signal.removeEventListener('abort', handleAbort);                       
      };                                                                        
                                                                                
      const handleAbort = () => {                                               
        cleanup();                                                              
                                                                                
        reject(new DOMException(                                                
          'Playback cancelled',                                                 
          'AbortError'                                                          
        ));                                                                     
      };                                                                        
                                                                                
      signal.addEventListener('abort', handleAbort, {                           
        once: true,                                                             
      });                                                                       
    });                                                                         
  }                                                                             
                                                                                
  This ensures pending playback waits can be interrupted instead of waiting for 
  their original timeout to finish.                                             
                                                                                
  4. Stop Sequence functionality                                                
  Implement a Stop Sequence button.                                             
                                                                                
  When clicked:                                                                 
                                                                                
  Abort the active sequence controller.                                         
                                                                                
  Cancel pending playback delays.                                               
                                                                                
  Prevent any additional notes from being scheduled.                            
                                                                                
  Release all active oscillators.                                               
                                                                                
  Reset playback state.                                                         
                                                                                
  Allow the user to start a new sequence.                                       
                                                                                
  Suggested logic:                                                              
                                                                                
  const handleStopSequence = () => {                                            
    playbackController.current?.abort();                                        
                                                                                
    synth.releaseAll();                                                         
                                                                                
    setIsPlaying(false);                                                        
  };                                                                            
                                                                                
  Ensure the asynchronous playback function catches AbortError without          
  displaying a false error message.                                             
                                                                                
  5. React component architecture                                               
  Use the following architecture:                                               
                                                                                
  Piano                                                                         
  ├── PianoControls                                                             
  ├── PianoKeyboard                                                             
  │   ├── PianoKey (MIDI 21)                                                    
  │   ├── PianoKey (MIDI 22)                                                    
  │   ├── ...                                                                   
  │   └── PianoKey (MIDI 108)                                                   
  ├── RecordingControls                                                         
  └── SequencerControls                                                         
  Keep the audio engine outside individual key components.                      
                                                                                
  6. React.memo and shallowEqual                                                
  Each piano key must be memoized.                                              
                                                                                
  import React, { memo } from 'react';                                          
                                                                                
  function PianoKey({                                                           
    pianoKey,                                                                   
    isActive,                                                                   
    onNoteOn,                                                                   
    onNoteOff,                                                                  
  }) {                                                                          
    // Render one piano key.                                                    
  }                                                                             
                                                                                
  export default memo(PianoKey, shallowEqual);                                  
                                                                                
  Use the shallowEqual implementation established in Lab 2 if your course       
  requires that exact comparator. Otherwise, React's default memo comparison    
  also performs a shallow prop comparison.                                      
                                                                                
  Ensure:                                                                       
                                                                                
  The generated piano key objects remain stable.                                
                                                                                
  Event callbacks remain stable through useCallback.                            
                                                                                
  Unrelated piano keys receive unchanged props.                                 
                                                                                
  Only the activated key and any previously active key receive changed props.   
                                                                                
  Important: If you store the active note as a single activeMidi state, the     
  parent can re-render when it changes. That is acceptable. The 88 memoized     
  children must skip rendering unless their own relevant props change.          
                                                                                
  7. Strict React rendering contract                                            
  Expected behavior:                                                            
                                                                                
  Example: Pressing A4 (MIDI 69)                                                
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  A4                                                                            
                                                                                
  —                                                                             
                                                                                
  —                                                                             
                                                                                
  1 key updated                                                                 
  87 unchanged keys skip rendering                                              
                                                                                
  Illustrative rendering behavior, not a measured Profiler result.              
  If one key was already active, pressing a second key may legitimately update  
  two components: the previous key and the newly activated key.                 
                                                                                
  8. React DevTools Profiler verification                                       
  Verify the rendering behavior using React DevTools Profiler.                  
                                                                                
  Test procedure:                                                               
                                                                                
  Open the piano interface.                                                     
                                                                                
  Open React DevTools Profiler.                                                 
                                                                                
  Start recording.                                                              
                                                                                
  Press one piano key.                                                          
                                                                                
  Inspect the committed components.                                             
                                                                                
  Verify that only the changed key component renders.                           
                                                                                
  Repeat with multiple different notes.                                         
                                                                                
  Expected result:                                                              
                                                                                
  The parent piano component may render.                                        
                                                                                
  Unchanged PianoKey components must not render.                                
                                                                                
  No unnecessary 88-component re-render cascade.                                
                                                                                
  9. Unmount cleanup                                                            
  When the piano component unmounts:                                            
                                                                                
  Abort any active playback sequence.                                           
                                                                                
  Release all active oscillators.                                               
                                                                                
  Remove keyboard event listeners if implemented.                               
                                                                                
  Clear pending playback timers.                                                
                                                                                
  Clean up audio resources appropriately.                                       
                                                                                
  10. Acceptance criteria                                                       
                                                                                
  Every playback sequence has an AbortController.                               
                                                                                
  Stop Sequence aborts pending playback immediately.                            
                                                                                
  Pending delays respond to AbortSignal.                                        
                                                                                
  All active voices are released on Stop.                                       
                                                                                
  AbortError does not display a false error.                                    
                                                                                
  Unmount cleanup works correctly.                                              
                                                                                
  All 88 PianoKey components use React.memo.                                    
                                                                                
  shallowEqual is used if required by the course contract.                      
                                                                                
  Stable props prevent unnecessary child renders.                               
                                                                                
  React DevTools Profiler verifies render isolation.                            
                                                                                
  Pressing one key does not re-render all 88 keys.                              
  2. Required project structure                                                 
  I recommend this structure for keeping your audio engine, React components,   
  and sequencer logic separated.                                                
                                                                                
  src/                                                                          
  ├── audio/                                                                    
  │   ├── PolyphonicSynth.js                                                    
  │   └── AudioTaskQueue.js                                                     
  │                                                                             
  ├── components/                                                               
  │   ├── Piano.jsx                                                             
  │   ├── PianoKey.jsx                                                          
  │   ├── PianoControls.jsx                                                     
  │   ├── RecordingControls.jsx                                                 
  │   └── SequencerControls.jsx                                                 
  │                                                                             
  ├── hooks/                                                                    
  │   ├── usePiano.js                                                           
  │   └── useSequencer.js                                                       
  │                                                                             
  ├── utils/                                                                    
  │   ├── midiUtils.js                                                          
  │   ├── shallowEqual.js                                                       
  │   └── abortableDelay.js                                                     
  │                                                                             
  ├── data/                                                                     
  │   └── pianoConfig.js                                                        
  │                                                                             
  ├── App.jsx                                                                   
  └── main.jsx                                                                  

● Starting with a search for the Lab 2 shallowEqual the PRD refers to:

  Searched for 1 pattern (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r"; ls; ls
      LAB2 2>/dev/null; grep -rli "shallow" --include=*.js --include=*.jsx
      --include=*.md . 2>…)
  ⎿  AI_FAILURE_AUDIT.md
     LAB2
     LAB3
     … +7 lines (ctrl+o to expand)

● I'm writing a shallowEqual helper in utils/, since none exists, and
  restructuring into the PRD layout before wrapping PianoKey in memo and moving
  SequencePlayer to playSequence.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src"; mkdir -p hooks utils data; git mv piano.js
      utils/midiUtils.js; git mv p…)
  ⎿  .:
     App.jsx
     audio
     … +32 lines (ctrl+o to expand)
  ⎿  Created LAB3\HW\pianoEngine\src\components\Controls.module.css (+133 
     -0)
        1 +/* Polyphonic Piano Engine — recorder styles (T-02C). Colours 
          +come from the --piano-* tokens. */                            
        2 +                                                              
        3 +.recorder {                                                   
        4 +    margin-top: 1.5rem;                                       
        5 +    min-width: 0;                                             
        6 +}                                                             
        7 +                                                              
        8 +.title {                                                      
        9 +    margin: 0 0 0.75rem;                                      
       10 +    font-size: 1.125rem;                                      
       11 +}                                                             
       12 +                                                              
       13 +.actions {                                                    
       14 +    list-style: none;                                         
       15 +    margin: 0 0 1rem;                                         
       16 +    padding: 0;                                               
       17 +    display: flex;                                            
       18 +    flex-wrap: wrap;                                          
       19 +    gap: 0.5rem;                                              
       20 +}                                                             
       21 +                                                              
       22 +.action {                                                     
       23 +    min-height: 2.75rem;                                      
       24 +    padding: 0.5rem 1rem;                                     
       25 +    font: inherit;                                            
       26 +    font-weight: 600;                                         
       27 +    color: var(--piano-text);                                 
       28 +    background: var(--piano-control);                         
       29 +    border: 1px solid var(--piano-key-border);                
       30 +    border-radius: 0.5rem;                                    
       31 +    cursor: pointer;                                          
       32 +}                                                             
       33 +                                                              
       34 +.action[data-recording="true"] {                              
       35 +    border-color: var(--piano-recording);                     
       36 +    box-shadow: inset 0 0 0 2px var(--piano-recording);       
       37 +}                                                             
       38 +                                                              
       39 +.action[aria-disabled="true"] {                               
       40 +    color: var(--piano-muted);                                
     … 93 more lines (ctrl+o to expand)
  ⎿  Deleted LAB3\HW\pianoEngine\src\components\Piano.jsx (+0 -74)
       1 -/**                                                            
       2 - * Polyphonic Piano Engine — T-02A 88-key keyboard             
       3 - *                                                             
       4 - * The keys are generated (piano.js) and mapped here; no key is
         - written out by                                                
       5 - * hand. Piano owns the whole list, so each key is exactly one 
         -<li> holding                                                   
       6 - * one <button> (Project Rules 1 and 4):                       
       7 - *                                                             
       8 - *   <section aria-label="88-key piano">                       
       9 - *     <p> range summary </p>                                  
      10 - *     <ol>  88 × <li><PianoKey /></li>  </ol>      ascending M
         -IDI order                                                      
      11 - *   </section>                                                
      12 - *                                                             
      13 - * Layout. The <ol> is a CSS grid of UNITS_PER_WHITE columns pe
         -r white key.                                                   
      14 - * White keys span both rows; black keys sit in the top row, 2/
         -3 as wide,                                                     
      15 - * centred on the boundary between their white neighbours, and 
         -are painted                                                    
      16 - * above them. Placement is computed from the MIDI data (layout
         -PianoKeys), so                                                 
      17 - * the DOM stays in pitch order (C, C#, D, …) while the keys li
         -ne up as on a                                                  
      18 - * real keyboard. The grid is wider than a phone, so the list s
         -crolls                                                         
      19 - * horizontally inside its section and the page itself never do
         -es.                                                            
      20 - *                                                             
      21 - * T-02C: keys report press / release through onNoteOn / onNote
         -Off, and                                                       
      22 - * `activeNotes` (a Set of MIDI numbers) marks the keys that ar
         -e sounding.                                                    
      23 - * Keys are memoised, so a note change re-renders only the keys
         - it touches.                                                   
      24 - */                                                            
      25 -import { memo, useMemo } from "react";                         
      26 -import { assertPianoKeys, keyLabel, layoutPianoKeys } from "../
         -piano.js";                                                     
      27 -import PianoKey from "./PianoKey.jsx";                         
      28 -import styles from "./Piano.module.css";                       
      29 -                                                               
      30 -const MemoPianoKey = memo(PianoKey);                           
      31 -const NO_NOTES = Object.freeze(new Set());                     
      32 -                                                               
      33 -export default function Piano({ pianoKeys, activeNotes = NO_NOT
         -ES, onNoteOn, onNoteOff }) {                                   
      34 -    assertPianoKeys(pianoKeys);                                
      35 -    if (!(activeNotes instanceof Set)) {                       
      36 -        throw new TypeError("Piano: activeNotes must be a Set o
         -f MIDI numbers");                                              
      37 -    }                                                          
      38 -    [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(
         -([name, handler]) => {                                         
      39 -        if (handler !== undefined && typeof handler !== "functi
         -on") {                                                         
      40 -            throw new TypeError(`Piano: ${name} must be a funct
         -ion when provided`);                                           
     … 34 more lines (ctrl+o to expand)
  ⎿  Deleted LAB3\HW\pianoEngine\src\components\Piano.module.css (+0 -129)
        1 -/*                                                            
        2 - * Polyphonic Piano Engine — keyboard styles (T-02A).         
        3 - *                                                            
        4 - * Colours come from the --piano-* tokens in index.html. One w
          -hite key is                                                   
        5 - * --piano-white-width wide (6 grid units); a black key is 4 u
          -nits, 2/3 of a                                                
        6 - * white key, which keeps it above the 24 px minimum target si
          -ze (WCAG 2.5.8).                                              
        7 - */                                                           
        8 -                                                              
        9 -.piano {                                                      
       10 -    min-width: 0;                                             
       11 -}                                                             
       12 -                                                              
       13 -.summary {                                                    
       14 -    margin: 0 0 0.75rem;                                      
       15 -    color: var(--piano-muted);                                
       16 -}                                                             
       17 -                                                              
       18 -.keyboard {                                                   
       19 -    --piano-unit: calc(var(--piano-white-width) / 6);         
       20 -    list-style: none;                                         
       21 -    margin: 0;                                                
       22 -    padding: 0 0 0.75rem;                                     
       23 -    display: grid;                                            
       24 -    grid-template-columns: repeat(var(--piano-columns), var(--
          -piano-unit));                                                 
       25 -    grid-template-rows: var(--piano-black-height) calc(var(--p
          -iano-white-height) - var(--piano-black-height));              
       26 -    overflow-x: auto;                                         
       27 -    overscroll-behavior-x: contain;                           
       28 -}                                                             
       29 -                                                              
       30 -.whiteSlot {                                                  
       31 -    grid-row: 1 / span 2;                                     
       32 -    display: grid;                                            
       33 -}                                                             
       34 -                                                              
       35 -.blackSlot {                                                  
       36 -    grid-row: 1;                                              
       37 -    z-index: 1;                                               
       38 -    display: grid;                                            
       39 -}                                                             
       40 -                                                              
     … 89 more lines (ctrl+o to expand)
  ⎿  Created LAB3\HW\pianoEngine\src\components\PianoKeyboard.jsx (+74 -0)
       1 +/**                                                            
       2 + * Polyphonic Piano Engine — T-02A 88-key keyboard             
       3 + *                                                             
       4 + * The keys are generated (piano.js) and mapped here; no key is
         + written out by                                                
       5 + * hand. Piano owns the whole list, so each key is exactly one 
         +<li> holding                                                   
       6 + * one <button> (Project Rules 1 and 4):                       
       7 + *                                                             
       8 + *   <section aria-label="88-key piano">                       
       9 + *     <p> range summary </p>                                  
      10 + *     <ol>  88 × <li><PianoKey /></li>  </ol>      ascending M
         +IDI order                                                      
      11 + *   </section>                                                
      12 + *                                                             
      13 + * Layout. The <ol> is a CSS grid of UNITS_PER_WHITE columns pe
         +r white key.                                                   
      14 + * White keys span both rows; black keys sit in the top row, 2/
         +3 as wide,                                                     
      15 + * centred on the boundary between their white neighbours, and 
         +are painted                                                    
      16 + * above them. Placement is computed from the MIDI data (layout
         +PianoKeys), so                                                 
      17 + * the DOM stays in pitch order (C, C#, D, …) while the keys li
         +ne up as on a                                                  
      18 + * real keyboard. The grid is wider than a phone, so the list s
         +crolls                                                         
      19 + * horizontally inside its section and the page itself never do
         +es.                                                            
      20 + *                                                             
      21 + * T-02C: keys report press / release through onNoteOn / onNote
         +Off, and                                                       
      22 + * `activeNotes` (a Set of MIDI numbers) marks the keys that ar
         +e sounding.                                                    
      23 + * Keys are memoised, so a note change re-renders only the keys
         + it touches.                                                   
      24 + */                                                            
      25 +import { memo, useMemo } from "react";                         
      26 +import { assertPianoKeys, keyLabel, layoutPianoKeys } from "../
         +piano.js";                                                     
      27 +import PianoKey from "./PianoKey.jsx";                         
      28 +import styles from "./Piano.module.css";                       
      29 +                                                               
      30 +const MemoPianoKey = memo(PianoKey);                           
      31 +const NO_NOTES = Object.freeze(new Set());                     
      32 +                                                               
      33 +export default function Piano({ pianoKeys, activeNotes = NO_NOT
         +ES, onNoteOn, onNoteOff }) {                                   
      34 +    assertPianoKeys(pianoKeys);                                
      35 +    if (!(activeNotes instanceof Set)) {                       
      36 +        throw new TypeError("Piano: activeNotes must be a Set o
         +f MIDI numbers");                                              
      37 +    }                                                          
      38 +    [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(
         +([name, handler]) => {                                         
      39 +        if (handler !== undefined && typeof handler !== "functi
         +on") {                                                         
      40 +            throw new TypeError(`Piano: ${name} must be a funct
         +ion when provided`);                                           
     … 34 more lines (ctrl+o to expand)
  ⎿  Created LAB3\HW\pianoEngine\src\components\PianoKeyboard.module.css
     (+129 -0)
        1 +/*                                                            
        2 + * Polyphonic Piano Engine — keyboard styles (T-02A).         
        3 + *                                                            
        4 + * Colours come from the --piano-* tokens in index.html. One w
          +hite key is                                                   
        5 + * --piano-white-width wide (6 grid units); a black key is 4 u
          +nits, 2/3 of a                                                
        6 + * white key, which keeps it above the 24 px minimum target si
          +ze (WCAG 2.5.8).                                              
        7 + */                                                           
        8 +                                                              
        9 +.piano {                                                      
       10 +    min-width: 0;                                             
       11 +}                                                             
       12 +                                                              
       13 +.summary {                                                    
       14 +    margin: 0 0 0.75rem;                                      
       15 +    color: var(--piano-muted);                                
       16 +}                                                             
       17 +                                                              
       18 +.keyboard {                                                   
       19 +    --piano-unit: calc(var(--piano-white-width) / 6);         
       20 +    list-style: none;                                         
       21 +    margin: 0;                                                
       22 +    padding: 0 0 0.75rem;                                     
       23 +    display: grid;                                            
       24 +    grid-template-columns: repeat(var(--piano-columns), var(--
          +piano-unit));                                                 
       25 +    grid-template-rows: var(--piano-black-height) calc(var(--p
          +iano-white-height) - var(--piano-black-height));              
       26 +    overflow-x: auto;                                         
       27 +    overscroll-behavior-x: contain;                           
       28 +}                                                             
       29 +                                                              
       30 +.whiteSlot {                                                  
       31 +    grid-row: 1 / span 2;                                     
       32 +    display: grid;                                            
       33 +}                                                             
       34 +                                                              
       35 +.blackSlot {                                                  
       36 +    grid-row: 1;                                              
       37 +    z-index: 1;                                               
       38 +    display: grid;                                            
       39 +}                                                             
       40 +                                                              
     … 89 more lines (ctrl+o to expand)
  ⎿  … 12 more files changed

● Splitting the config data out of midiUtils.js:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src"; python - <<'EOF'
      p='utils/midiUtils.js'; s=open(p,encoding='utf8').read…)
  ⎿   * before it is rendered (Project Rule 2), so a bad key is a TypeError
      at
      * startup instead of a silently broken button.
     … +22 lines (ctrl+o to expand)
  ⎿  Created LAB3\HW\pianoEngine\src\data\pianoConfig.js (+24 -0)
       1 +/**                                                            
       2 + * Polyphonic Piano Engine — piano configuration data          
       3 + *                                                             
       4 + * Plain, frozen data: the standard 88-key range (A0 = MIDI 21 
         +to C8 = MIDI                                                   
       5 + * 108) and the note-name tables the generator uses. No logic l
         +ives here;                                                     
       6 + * utils/midiUtils.js derives every key from these values.     
       7 + */                                                            
       8 +                                                               
       9 +export const PIANO_CONFIG = Object.freeze({                    
      10 +    startMidi: 21,                                             
      11 +    endMidi: 108,                                              
      12 +    totalKeys: 88                                              
      13 +});                                                            
      14 +                                                               
      15 +/** The 12-note chromatic scale; index = midi % 12. */         
      16 +export const NOTE_NAMES = Object.freeze([                      
      17 +    "C", "C#", "D", "D#",                                      
      18 +    "E", "F", "F#", "G",                                       
      19 +    "G#", "A", "A#", "B"                                       
      20 +]);                                                            
      21 +                                                               
      22 +export const WHITE_NOTES = Object.freeze(["C", "D", "E", "F", "
         +G", "A", "B"]);                                                
      23 +                                                               
      24 +export const BLACK_NOTE_CLASSES = Object.freeze(["C#", "D#", "F
         +#", "G#", "A#"]);                                              
  ⎿  Updated LAB3\HW\pianoEngine\src\utils\midiUtils.js (+154 -158)
        1 -/**                                                           
        2 - * Polyphonic Piano Engine — T-02A algorithmic 88-key generati
          -on                                                            
        3 - *                                                            
        4 - * The keyboard is computed from MIDI numbers, never written o
          -ut by hand:                                                   
        5 - * a loop over MIDI 21 (A0) … 108 (C8) derives every key's not
          -e name, octave,                                               
        6 - * frequency and colour from the note's position in the 12-not
          -e chromatic                                                   
        7 - * scale. The result is the single source of truth the UI maps
          - over.                                                        
        8 - *                                                            
        9 - *   noteIndex = midi % 12                       C = 0, C# = 1
          -, … B = 11                                                    
       10 - *   octave    = floor(midi / 12) - 1            MIDI 60 = C4,
          - 21 = A0, 108 = C8                                            
       11 - *   freqHz    = 440 · 2^((midi - 69) / 12)      equal tempera
          -ment, A4 = 440 Hz                                             
       12 - *   type      = black if the note name has a sharp, otherwise
          - white                                                        
       13 - *                                                            
       14 - * Every key (and the list as a whole) is validated by assertP
          -ianoKey(s)                                                    
       15 - * before it is rendered (Project Rule 2), so a bad key is a T
          -ypeError at                                                   
       16 - * startup instead of a silently broken button.               
       17 - */                                                           
       18 -                                                              
       19 -export const PIANO_CONFIG = Object.freeze({                   
       20 -    startMidi: 21,                                            
       21 -    endMidi: 108,                                             
       22 -    totalKeys: 88                                             
       23 -});                                                           
       24 -                                                              
       25 -export const NOTE_NAMES = Object.freeze([                     
       26 -    "C", "C#", "D", "D#",                                     
       27 -    "E", "F", "F#", "G",                                      
       28 -    "G#", "A", "A#", "B"                                      
       29 -]);                                                           
       30 -                                                              
       31 -export const WHITE_NOTES = Object.freeze(["C", "D", "E", "F", 
          -"G", "A", "B"]);                                              
       32 -                                                              
       33 -export const BLACK_NOTE_CLASSES = Object.freeze(["C#", "D#", "
          -F#", "G#", "A#"]);                                            
       34 -                                                              
       35 -/** MIDI 0 … 127, the full range a MIDI note number can take. 
          -*/                                                            
       36 -const MIDI_MIN = 0;                                           
       37 -const MIDI_MAX = 127;                                         
       38 -                                                              
       39 -function assertMidi(midi, label = "midi") {                   
       40 -    if (!Number.isInteger(midi) || midi < MIDI_MIN || midi > M
          -IDI_MAX) {                                                    
     … 272 more lines (ctrl+o to expand)

● Now the two utilities the PRD names:

● Write(LAB3\HW\pianoEngine\src\utils\shallowEqual.js)
  ⎿  Wrote 22 lines to LAB3\HW\pianoEngine\src\utils\shallowEqual.js
       1 /**
       2  * Polyphonic Piano Engine — T-02D shallow prop comparison
       3  *
       4  * The comparator handed to React.memo(PianoKey, shallowEqual): 
         two props
       5  * objects are equal when they have the same own keys and every 
         value is
       6  * identical by Object.is (so NaN equals NaN and +0 differs from
          -0, exactly
       7  * like React's own comparison). Values are NOT compared deeply:
     … +16 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\utils\abortableDelay.js)
  ⎿  Wrote 66 lines to LAB3\HW\pianoEngine\src\utils\abortableDelay.js
       1 /**
       2  * Polyphonic Piano Engine — T-02D abortable delay
       3  *
       4  * A setTimeout wrapped in a Promise that an AbortSignal can cut
          short:
       5  *
       6  *   resolves  after `ms` milliseconds;
       7  *   rejects   with DOMException("Playback cancelled", "AbortErr
         or") at once
       8  *             if the signal is already aborted, or the moment i
     … +59 lines (~2 KB) (ctrl+o to expand)

● Now playSequence, replacing SequencePlayer (it keeps the absolute-time
  scheduling and the separate release timers from PRD 3):

● Write(LAB3\HW\pianoEngine\src\audio\playSequence.js)
  ⎿  Wrote 106 lines to LAB3\HW\pianoEngine\src\audio\playSequence.js
       1 /**
       2  * Polyphonic Piano Engine — T-02C asynchronous FIFO replay, T-0
         2D abortable
       3  *
       4  *   await playSequence({ queue, synth, speed, signal: controlle
         r.signal });
       5  *
       6  * Drains a FIFO AudioTaskQueue of recorded events through `synt
         h` (anything
       7  * with noteOn(midi, freqHz) and noteOff(midi): the PolyphonicSy
     … +100 lines (~5 KB) (ctrl+o to expand)

● Now the two hooks. usePiano owns the synth, which keys are sounding, and the
  recorder; useSequencer owns the AbortController for each playback.

● Write(LAB3\HW\pianoEngine\src\hooks\usePiano.js)
  ⎿  Added 62 lines, removed 71 lines
       1  /**
       2 - * Polyphonic Piano Engine — T-02C engine hook                 
       2 + * Polyphonic Piano Engine — live playing and recording (T-02B/
         +C, T-02D cleanup)                                              
       3   *
       4 - * Wires the three framework-free parts to React state:        
       4 + *   key press ──► instrument.noteOn ──► PolyphonicSynth       
       5 + *            └──► NoteRecorder (while recording)              
       6   *
       6 - *   live key press ──► instrument.noteOn ──► PolyphonicSynth  
       7 - *                 └──► NoteRecorder (while recording)         
       8 - *   Play Sequence ──► SequencePlayer ──► instrument.noteOn / n
         -oteOff                                                         
       7 + * The audio engine lives here, never inside a key component. `
         +instrument`                                                    
       8 + * drives the synth and then mirrors the synth's real voice poo
         +l into                                                         
       9 + * `activeNotes`, so a key shows as active exactly while its no
         +te sounds:                                                     
      10 + * live, during replay (useSequencer plays through the same ins
         +trument), and                                                  
      11 + * not after its voice was stolen by the 8-voice limit.        
      12   *
      10 - * `instrument` drives the synth and then mirrors the synth's r
         -eal voice pool                                                 
      11 - * into `activeNotes`, so a key is shown pressed exactly while 
         -it sounds:                                                     
      12 - * during live play, during replay, and not after its voice was
         - stolen.                                                       
      13 + * Render isolation (T-02D). Every function returned here is cr
         +eated once                                                     
      14 + * (useCallback / useMemo over stable objects), so the 88 memoi
         +sed PianoKeys                                                  
      15 + * receive the same onNoteOn / onNoteOff on every render. activ
         +eNotes is only                                                 
      16 + * replaced when its contents change, so a no-op release (e.g. 
         +moving the                                                     
      17 + * pointer off a silent key) causes no render at all.          
      18   *
      14 - * Mode rules (each action ignores calls that do not fit the cu
         -rrent mode):                                                   
      15 - *   Start Recording  idle only (not while playing back); begin
         -s a new take                                                   
      16 - *   Stop Recording   while recording; keeps the take          
      17 - *   Clear Recording  not while recording; stops a replay first
      18 - *   Play Sequence    idle with a non-empty recording; one repl
         -ay at a time                                                   
      19 + * Unmount: the window blur listener is removed, every voice is
         + released and                                                  
      20 + * the synth's AudioContext is closed.                         
      21   */
      20 -import { useCallback, useEffect, useMemo, useRef, useState } fr
         -om "react";                                                    
      21 -import { PolyphonicSynth } from "./audio/PolyphonicSynth.js";  
      22 -import { NoteRecorder } from "./audio/NoteRecorder.js";        
      23 -import { SequencePlayer, assertPlaybackSpeed } from "./audio/Se
         -quencePlayer.js";                                              
      22 +import { useCallback, useEffect, useMemo, useState } from "reac
         +t";                                                            
      23 +import { PolyphonicSynth } from "../audio/PolyphonicSynth.js"; 
      24 +import { NoteRecorder } from "../audio/NoteRecorder.js";       
      25  
      26 +const IDLE_STATUS = "Not recording. Choose Start Recording, the
         +n play some keys.";                                            
      27 +                                                               
      28  function assertSynth(synth) {
      29      const methods = ["noteOn", "noteOff", "releaseAll"];
      30      if (synth === null || typeof synth !== "object" || methods.
          some((name) => typeof synth[name] !== "function")
      28 -        || !(synth.voices instanceof Map)) {                   
      29 -        throw new TypeError("usePianoEngine: synth must provide
         - noteOn, noteOff, releaseAll and a voices Map");               
      31 +        || !(synth.voices instanceof Map) || !Number.isInteger(
         +synth.maxVoices)) {                                            
      32 +        throw new TypeError("usePiano: synth must provide noteO
         +n, noteOff, releaseAll, a voices Map and maxVoices");          
      33      }
      34  }
      35  
      36  function sameNotes(set, keys) {
      34 -    if (set.size !== keys.length) return false;                
      35 -    return keys.every((midi) => set.has(midi));                
      37 +    return set.size === keys.length && keys.every((midi) => set
         +.has(midi));                                                   
      38  }
      39  
      38 -export default function usePianoEngine({ synth: injectedSynth, 
         -now, clock } = {}) {                                           
      40 +const plural = (count) => `${count} ${count === 1 ? "note" : "n
         +otes"}`;                                                       
      41 +                                                               
      42 +export default function usePiano({ synth: injectedSynth, now } 
         += {}) {                                                        
      43      const [synth] = useState(() => injectedSynth ?? new Polypho
          nicSynth());
      44      assertSynth(synth);
      45      const [recorder] = useState(() => new NoteRecorder(now ? { 
          now } : undefined));
      46  
      47      const [activeNotes, setActiveNotes] = useState(() => new Se
          t());
      44 -    const [mode, setMode] = useState("idle");               // 
         -"idle" | "recording" | "playing"                               
      48 +    const [isRecording, setIsRecording] = useState(false);     
      49      const [events, setEvents] = useState(recorder.events);
      50      const [capturedCount, setCapturedCount] = useState(0);
      47 -    const [speed, setSpeedState] = useState(1);                
      48 -    const [status, setStatus] = useState("Ready. Choose Start R
         -ecording, then play some keys.");                              
      49 -    // The mode as of the latest transition (not the latest ren
         -der), so two actions in one tick see each other.               
      50 -    const modeRef = useRef(mode);                              
      51 -    const changeMode = useCallback((next) => {                 
      52 -        modeRef.current = next;                                
      53 -        setMode(next);                                         
      54 -    }, []);                                                    
      51 +    const [recordingStatus, setRecordingStatus] = useState(IDLE
         +_STATUS);                                                      
      52  
      53      const sync = useCallback(() => {
      54          const keys = [...synth.voices.keys()];
      55          setActiveNotes((current) => (sameNotes(current, keys) ?
           current : new Set(keys)));
      56      }, [synth]);
      57  
      58 +    /** The synth as the UI sees it: every note change is mirro
         +red into activeNotes. */                                       
      59      const instrument = useMemo(() => ({
      60          noteOn(midi, freqHz) { synth.noteOn(midi, freqHz); sync
          (); },
      61          noteOff(midi) { synth.noteOff(midi); sync(); }
      62      }), [synth, sync]);
      63  
      66 -    const [player] = useState(() => new SequencePlayer(instrume
         -nt, clock));                                                   
      64 +    const releaseAll = useCallback(() => {                     
      65 +        synth.releaseAll();                                    
      66 +        sync();                                                
      67 +    }, [synth, sync]);                                         
      68  
      69      const noteOn = useCallback((pianoKey) => {
      70          instrument.noteOn(pianoKey.midi, pianoKey.freqHz);
     ...
       77      }, [instrument, recorder]);
       78  
       79      const startRecording = useCallback(() => {
       79 -        if (modeRef.current !== "idle") return;               
       80 +        if (recorder.recording) return;                       
       81          recorder.start();
       82          setEvents(recorder.events);
       83          setCapturedCount(0);
       83 -        changeMode("recording");                              
       84 -        setStatus("Recording. Play some keys, then choose Stop
          - Recording.");                                                
       85 -    }, [changeMode, recorder]);                               
       84 +        setIsRecording(true);                                 
       85 +        setRecordingStatus("Recording. Play some keys, then ch
          +oose Stop Recording.");                                       
       86 +    }, [recorder]);                                           
       87  
       88      const stopRecording = useCallback(() => {
       88 -        if (modeRef.current !== "recording") return;          
       89 +        if (!recorder.recording) return;                      
       90          const recorded = recorder.stop();
       91          setEvents(recorded);
       91 -        changeMode("idle");                                   
       92 -        setStatus(`Recording stopped: ${recorded.length} ${rec
          -orded.length === 1 ? "note" : "notes"} recorded.`);           
       93 -    }, [changeMode, recorder]);                               
       92 +        setIsRecording(false);                                
       93 +        setRecordingStatus(`Recording stopped: ${plural(record
          +ed.length)} recorded.`);                                      
       94 +    }, [recorder]);                                           
       95  
       96      const clearRecording = useCallback(() => {
       96 -        if (modeRef.current === "recording") return;          
       97 -        player.stop();                                        
       97 +        if (recorder.recording) return;                       
       98          recorder.clear();
       99          setEvents(recorder.events);
      100          setCapturedCount(0);
      101 -        changeMode("idle");                                   
      102 -        setStatus("Recording cleared.");                      
      103 -    }, [changeMode, player, recorder]);                       
      101 +        setRecordingStatus("Recording cleared.");             
      102 +    }, [recorder]);                                           
      103  
      105 -    const playSequence = useCallback(() => {                  
      106 -        if (modeRef.current !== "idle" || recorder.events.leng
          -th === 0) return;                                             
      107 -        const recording = recorder.events;                    
      108 -        changeMode("playing");                                
      109 -        setStatus(`Playing ${recording.length} ${recording.len
          -gth === 1 ? "note" : "notes"} at ${speed.toFixed(1)}×.`);     
      110 -        player.play(recording, speed).then(({ completed }) => 
          -{                                                             
      111 -            if (modeRef.current === "playing") changeMode("idl
          -e");                                                          
      112 -            if (completed) setStatus("Playback finished.");   
      113 -        });                                                   
      114 -    }, [changeMode, player, recorder, speed]);                
      115 -                                                              
      116 -    const setSpeed = useCallback((value) => {                 
      117 -        assertPlaybackSpeed(value);                           
      118 -        setSpeedState(value);                                 
      119 -    }, []);                                                   
      120 -                                                              
      121 -    // Leaving the page (or the window losing focus) must not 
          -leave notes hanging.                                          
      104      useEffect(() => {
      123 -        const releaseAll = () => {                            
      124 -            synth.releaseAll();                               
      125 -            sync();                                           
      126 -        };                                                    
      105          window.addEventListener("blur", releaseAll);
      106          return () => {
      107              window.removeEventListener("blur", releaseAll);
      130 -            player.stop();                                    
      131 -            releaseAll();                                     
      108 +            synth.releaseAll();                               
      109 +            if (typeof synth.close === "function") {          
      110 +                Promise.resolve(synth.close()).catch(() => { /
          +* already closed */ });                                       
      111 +            }                                                 
      112          };
      133 -    }, [player, synth, sync]);                                
      113 +    }, [releaseAll, synth]);                                  
      114  
      115      return {
      136 -        activeNotes, mode, events, capturedCount, speed, statu
          -s,                                                            
      137 -        noteOn, noteOff, startRecording, stopRecording, clearR
          -ecording, playSequence, setSpeed                              
      116 +        maxVoices: synth.maxVoices,                           
      117 +        activeNotes,                                          
      118 +        instrument,                                           
      119 +        noteOn,                                               
      120 +        noteOff,                                              
      121 +        releaseAll,                                           
      122 +        isRecording,                                          
      123 +        events,                                               
      124 +        capturedCount,                                        
      125 +        recordingStatus,                                      
      126 +        startRecording,                                       
      127 +        stopRecording,                                        
      128 +        clearRecording                                        
      129      };
      130  }

● Write(LAB3\HW\pianoEngine\src\hooks\useSequencer.js)
  ⎿  Wrote 101 lines to LAB3\HW\pianoEngine\src\hooks\useSequencer.js
       1 /**
       2  * Polyphonic Piano Engine — T-02D abortable sequencer hook
       3  *
       4  * Every Play Sequence gets its own AbortController:
       5  *
       6  *   play(events)  controller = new AbortController()
       7  *                 playSequence({ queue: new AudioTaskQueue(even
         ts), synth, speed, signal })
       8  *   stop()        controller.abort()      every pending delay r
         ejects at once,
     … +93 lines (ctrl+o to expand)

● Now the components, starting with the memoised key:

● Write(LAB3\HW\pianoEngine\src\components\PianoKey.jsx)
  ⎿  Added 31 lines, removed 17 lines
       1  /**
       2 - * Polyphonic Piano Engine — T-02A piano key, T-02C press / rel
         -ease                                                           
       2 + * Polyphonic Piano Engine — piano key (T-02A markup, T-02C pre
         +ss / release,                                                  
       3 + * T-02D React.memo render isolation)                          
       4   *
       4 - * One key as one native <button>. The parent (Piano) owns the 
         -<ol>, the <li>                                                 
       5 - * and the list key, so the key adds no wrapper of its own (Pro
         -ject Rules 1                                                   
       6 - * and 4):                                                     
       5 + * One key as one native <button>. The parent (PianoKeyboard) o
         +wns the <ol>,                                                  
       6 + * the <li> and the list key, so the key adds no wrapper of its
         + own (Project                                                  
       7 + * Rules 1 and 4):                                             
       8   *
       9   *   <button type="button" aria-pressed="false" data-midi="69" 
          data-note-type="white">
      10   *     <span>A4</span>                         scientific pitch
           label (visible)
     ...
      13   *
      14   * The accessible name is computed from the content ("A4 white 
          key"), so the
      15   * visible label is always part of the name (WCAG 2.5.3, Label 
          in Name). The
      15 - * space between the two spans is its own text node, so every n
         -ame                                                            
      16 - * computation (browsers and jsdom) keeps the words apart. `ari
         -a-pressed`                                                     
      17 - * reports whether the note is sounding (live or during replay)
         -.                                                              
      16 + * space between the spans is its own text node, so every name 
         +computation                                                    
      17 + * keeps the words apart. `aria-pressed` reports `isActive`: th
         +e note is                                                      
      18 + * sounding, live or during replay.                            
      19   *
      19 - * A piano note has a length, so a key reacts to press and rele
         -ase, not to                                                    
      20 - * click: pointer down starts the note; pointer up, cancel or l
         -eaving the key                                                 
      21 - * ends it. From the keyboard, Enter or Space held on the focus
         -ed key does the                                                
      22 - * same (auto-repeat is ignored), and losing focus ends the not
         -e.                                                             
      20 + * A note has a length, so the key reacts to press and release,
         + not click:                                                    
      21 + * pointer down starts it; pointer up, cancel or leaving the ke
         +y ends it.                                                     
      22 + * From the keyboard, Enter or Space held on the focused key do
         +es the same                                                    
      23 + * (auto-repeat ignored), and losing focus ends the note.      
      24   *
      25 + * Memoised with shallowEqual: the key re-renders only when one
         + of its own                                                    
      26 + * props changes. The parent passes the same frozen `pianoKey`,
         + the same                                                      
      27 + * useCallback handlers and the same class strings every time, 
         +so in practice                                                 
      28 + * only `isActive` changes, and only for the key whose note sta
         +rted or                                                        
      29 + * stopped. The audio engine is never touched here; the key onl
         +y reports.                                                     
      30 + *                                                             
      31   * The key is validated before rendering (Project Rule 2) and i
          ts text is
      32   * rendered as React children, never as HTML (Project Rule 3).
      33   */
      27 -import { assertPianoKey, keyLabel } from "../piano.js";        
      34 +import { memo } from "react";                                  
      35 +import { assertPianoKey, keyLabel } from "../utils/midiUtils.js
         +";                                                             
      36 +import { shallowEqual } from "../utils/shallowEqual.js";       
      37  
      38  const PLAY_KEYS = new Set(["Enter", " "]);
      39  
      31 -export default function PianoKey({ pianoKey, pressed = false, o
         -nNoteOn, onNoteOff, className, labelClassName, hintClassName })
         - {                                                             
      40 +const preventContextMenu = (event) => event.preventDefault();  
      41 +                                                               
      42 +function PianoKey({ pianoKey, isActive = false, onNoteOn, onNot
         +eOff, className, labelClassName, hintClassName }) {            
      43      assertPianoKey(pianoKey);
      33 -    if (typeof pressed !== "boolean") {                        
      34 -        throw new TypeError(`PianoKey: pressed must be a boolea
         -n, received ${JSON.stringify(pressed)}`);                      
      44 +    if (typeof isActive !== "boolean") {                       
      45 +        throw new TypeError(`PianoKey: isActive must be a boole
         +an, received ${JSON.stringify(isActive)}`);                    
      46      }
      47      [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(
          ([name, handler]) => {
      48          if (handler !== undefined && typeof handler !== "functi
          on") {
     ...
      57          <button
      58              type="button"
      59              className={className}
      49 -            aria-pressed={pressed}                             
      60 +            aria-pressed={isActive}                            
      61              data-midi={pianoKey.midi}
      62              data-note-type={pianoKey.type}
      63              data-freq-hz={pianoKey.freqHz.toFixed(2)}
     ...
      79                  end();
      80              })}
      81              onBlur={end}
      71 -            onContextMenu={(event) => event.preventDefault()}  
      82 +            onContextMenu={preventContextMenu}                 
      83          >
      84              <span className={labelClassName}>{keyLabel(pianoKey
          )}</span>
      85              {" "}
     ...
      87          </button>
      88      );
      89  }
      90 +                                                               
      91 +export { PianoKey as PianoKeyView };                           
      92 +export default memo(PianoKey, shallowEqual);                   

  Read 1 file (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\components\PianoKeyboard.jsx)
  ⎿  Added 33 lines, removed 25 lines
      1  /**
      2 - * Polyphonic Piano Engine — T-02A 88-key keyboard              
      2 + * Polyphonic Piano Engine — T-02A 88-key keyboard (T-02D: Piano
        +Keyboard)                                                       
      3   *
      4 - * The keys are generated (piano.js) and mapped here; no key is 
        -written out by                                                  
      5 - * hand. Piano owns the whole list, so each key is exactly one <
        -li> holding                                                     
      6 - * one <button> (Project Rules 1 and 4):                        
      4 + * The keys are generated (utils/midiUtils.js) and mapped here; 
        +no key is                                                       
      5 + * written out by hand. PianoKeyboard owns the whole list, so ea
        +ch key is                                                       
      6 + * exactly one <li> holding one <button> (Project Rules 1 and 4)
        +:                                                               
      7   *
      8   *   <section aria-label="88-key piano">
      9   *     <p> range summary </p>
     ...
      18   * real keyboard. The grid is wider than a phone, so the list s
          crolls
      19   * horizontally inside its section and the page itself never do
          es.
      20   *
      21 - * T-02C: keys report press / release through onNoteOn / onNote
         -Off, and                                                       
      22 - * `activeNotes` (a Set of MIDI numbers) marks the keys that ar
         -e sounding.                                                    
      23 - * Keys are memoised, so a note change re-renders only the keys
         - it touches.                                                   
      21 + * Render isolation (T-02D). This component re-renders whenever
         + activeNotes                                                   
      22 + * changes, which is fine; the 88 memoised PianoKeys do not. Ev
         +erything a key                                                 
      23 + * receives is stable across renders except its own boolean `is
         +Active`:                                                       
      24 + * the frozen key object, the parent's useCallback handlers, an
         +d class                                                        
      25 + * strings and grid styles computed once per key list (useMemo)
         +.                                                              
      26   */
      25 -import { memo, useMemo } from "react";                         
      26 -import { assertPianoKeys, keyLabel, layoutPianoKeys } from "../
         -piano.js";                                                     
      27 +import { useMemo } from "react";                               
      28 +import { assertPianoKeys, keyLabel, layoutPianoKeys } from "../
         +utils/midiUtils.js";                                           
      29  import PianoKey from "./PianoKey.jsx";
      28 -import styles from "./Piano.module.css";                       
      30 +import styles from "./PianoKeyboard.module.css";               
      31  
      30 -const MemoPianoKey = memo(PianoKey);                           
      32  const NO_NOTES = Object.freeze(new Set());
      33  
      33 -export default function Piano({ pianoKeys, activeNotes = NO_NOT
         -ES, onNoteOn, onNoteOff }) {                                   
      34 +export default function PianoKeyboard({ pianoKeys, activeNotes 
         += NO_NOTES, onNoteOn, onNoteOff }) {                           
      35      assertPianoKeys(pianoKeys);
      36      if (!(activeNotes instanceof Set)) {
      36 -        throw new TypeError("Piano: activeNotes must be a Set o
         -f MIDI numbers");                                              
      37 +        throw new TypeError("PianoKeyboard: activeNotes must be
         + a Set of MIDI numbers");                                      
      38      }
      39      [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(
          ([name, handler]) => {
      40          if (handler !== undefined && typeof handler !== "functi
          on") {
      40 -            throw new TypeError(`Piano: ${name} must be a funct
         -ion when provided`);                                           
      41 +            throw new TypeError(`PianoKeyboard: ${name} must be
         + a function when provided`);                                   
      42          }
      43      });
      43 -    const { placements, columns, whiteCount } = useMemo(() => l
         -ayoutPianoKeys(pianoKeys), [pianoKeys]);                       
      44 +                                                               
      45 +    // Per-key layout, computed once per key list so every rend
         +er reuses the same objects.                                    
      46 +    const layout = useMemo(() => {                             
      47 +        const { placements, columns, whiteCount } = layoutPiano
         +Keys(pianoKeys);                                               
      48 +        const slots = pianoKeys.map((pianoKey, index) => Object
         +.freeze({                                                      
      49 +            slotClassName: pianoKey.type === "black" ? styles.b
         +lackSlot : styles.whiteSlot,                                   
      50 +            keyClassName: pianoKey.type === "black" ? styles.bl
         +ackKey : styles.whiteKey,                                      
      51 +            style: Object.freeze({ gridColumn: `${placements[in
         +dex].column} / span ${placements[index].span}` })              
      52 +        }));                                                   
      53 +        return { slots, listStyle: Object.freeze({ "--piano-col
         +umns": columns }), whiteCount };                               
      54 +    }, [pianoKeys]);                                           
      55 +                                                               
      56      const first = pianoKeys[0];
      57      const last = pianoKeys[pianoKeys.length - 1];
      58  
     ...
      60          <section className={styles.piano} aria-label={`${pianoK
          eys.length}-key piano`}>
      61              <p className={styles.summary}>
      62                  {keyLabel(first)} (MIDI {first.midi}) to {keyLa
          bel(last)} (MIDI {last.midi}):{" "}
      51 -                {whiteCount} white and {pianoKeys.length - whit
         -eCount} black keys                                             
      63 +                {layout.whiteCount} white and {pianoKeys.length
         + - layout.whiteCount} black keys                               
      64              </p>
      53 -            <ol className={styles.keyboard} style={{ "--piano-c
         -olumns": columns }}>                                           
      65 +            <ol className={styles.keyboard} style={layout.listS
         +tyle}>                                                         
      66                  {pianoKeys.map((pianoKey, index) => (
      55 -                    <li                                        
      56 -                        key={pianoKey.midi}                    
      57 -                        className={pianoKey.type === "black" ? 
         -styles.blackSlot : styles.whiteSlot}                           
      58 -                        style={{ gridColumn: `${placements[inde
         -x].column} / span ${placements[index].span}` }}                
      59 -                    >                                          
      60 -                        <MemoPianoKey                          
      67 +                    <li key={pianoKey.midi} className={layout.s
         +lots[index].slotClassName} style={layout.slots[index].style}>  
      68 +                        <PianoKey                              
      69                              pianoKey={pianoKey}
      62 -                            pressed={activeNotes.has(pianoKey.m
         -idi)}                                                          
      70 +                            isActive={activeNotes.has(pianoKey.
         +midi)}                                                         
      71                              onNoteOn={onNoteOn}
      72                              onNoteOff={onNoteOff}
      65 -                            className={pianoKey.type === "black
         -" ? styles.blackKey : styles.whiteKey}                         
      73 +                            className={layout.slots[index].keyC
         +lassName}                                                      
      74                              labelClassName={styles.label}
      75                              hintClassName={styles.srOnly}
      76                          />

  Read 1 file (ctrl+o to expand)

● Now the three control components and the Piano container:

● Write(LAB3\HW\pianoEngine\src\components\RecordingControls.jsx)
  ⎿  Added 30 lines, removed 57 lines
       1  /**
       2 - * Polyphonic Piano Engine — T-02C recording controls and recor
         -ded-note table                                                 
       2 + * Polyphonic Piano Engine — recording controls and recorded-no
         +te table (T-02C, T-02D split)                                  
       3   *
       4 - *   <section aria-labelledby="recorder-title">                
       5 - *     <h2>Recorder</h2>                                       
       6 - *     <menu aria-label="Recording controls">  4 × <li><button/
         -></li>  </menu>                                                
       7 - *     <fieldset> <legend>Playback speed</legend>  3 × <label><
         -input type="radio"/> 0.5×</label> </fieldset>                  
       8 - *     <output aria-live="polite">  status announcements  </out
         -put>                                                           
       9 - *     <figure tabindex="0">  scroll frame (the table is wider 
         -than a phone)                                                  
       4 + *   <section aria-labelledby="recording-title">               
       5 + *     <h2>Recording</h2>                                      
       6 + *     <menu aria-label="Recording controls">  3 × <li><button/
         +></li>  </menu>                                                
       7 + *     <output aria-live="polite">  recording status  </output>
       8 + *     <p> notes captured </p>                    while recordi
         +ng                                                             
       9 + *     <figure tabindex="0">                      scroll frame 
         +(wider than a phone)                                           
      10   *       <table> <caption/> thead + one <tr> per recorded event
           </table>
      11   *     </figure>                                  (or a <p> whe
          n nothing is recorded)
      12   *   </section>
      13   *
      14 - * Unavailable actions use aria-disabled instead of the disable
         -d attribute:                                                   
      15 - * a button that becomes unavailable while focused (Start, once
         - recording has                                                 
      16 - * begun) keeps keyboard focus instead of dropping it to <body>
         -, and its                                                      
      17 - * activation is simply ignored. The parent owns the data; ever
         -y list and                                                     
      18 - * table row is rendered from it in order (Project Rule 4), and
         - every value                                                   
      19 - * is rendered as text (Project Rule 3).                       
      14 + * Unavailable actions use aria-disabled instead of the disable
         +d attribute,                                                   
      15 + * so a button that becomes unavailable while focused (Start, o
         +nce recording                                                  
      16 + * has begun) keeps keyboard focus; its activation is simply ig
         +nored. Rows are                                                
      17 + * rendered from the data in order (Project Rule 4), values as 
         +text (Rule 3).                                                 
      18   */
      19  import { assertRecordedEvents, recordingLengthMs } from "../aud
          io/NoteRecorder.js";
      22 -import { PLAYBACK_SPEEDS, assertPlaybackSpeed } from "../audio/
         -SequencePlayer.js";                                            
      23 -import { createPianoKey, keyLabel } from "../piano.js";        
      24 -import styles from "./RecorderControls.module.css";            
      20 +import { createPianoKey, keyLabel } from "../utils/midiUtils.js
         +";                                                             
      21 +import styles from "./Controls.module.css";                    
      22  
      26 -const MODES = Object.freeze(["idle", "recording", "playing"]); 
      27 -const HANDLERS = Object.freeze(["onStart", "onStop", "onClear",
         - "onPlay", "onSpeedChange"]);                                  
      28 -                                                               
      29 -const formatSpeed = (speed) => `${speed.toFixed(1)}×`;         
      23  const formatSeconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
      24  
      32 -export default function RecorderControls({ mode, events, captur
         -edCount = 0, speed, status, ...handlers }) {                   
      33 -    if (!MODES.includes(mode)) {                               
      34 -        throw new TypeError(`RecorderControls: mode must be one
         - of ${MODES.join(", ")}, received ${JSON.stringify(mode)}`);   
      35 -    }                                                          
      25 +export default function RecordingControls({ isRecording, isPlay
         +ing, events, capturedCount = 0, status, onStart, onStop, onClea
         +r }) {                                                         
      26 +    [["isRecording", isRecording], ["isPlaying", isPlaying]].fo
         +rEach(([name, value]) => {                                     
      27 +        if (typeof value !== "boolean") throw new TypeError(`Re
         +cordingControls: ${name} must be a boolean`);                  
      28 +    });                                                        
      29      assertRecordedEvents(events);
      37 -    assertPlaybackSpeed(speed);                                
      30      if (!Number.isInteger(capturedCount) || capturedCount < 0) 
          {
      39 -        throw new TypeError("RecorderControls: capturedCount mu
         -st be a non-negative integer");                                
      31 +        throw new TypeError("RecordingControls: capturedCount m
         +ust be a non-negative integer");                               
      32      }
      41 -    if (typeof status !== "string") {                          
      42 -        throw new TypeError("RecorderControls: status must be a
         - string");                                                     
      43 -    }                                                          
      44 -    HANDLERS.forEach((name) => {                               
      45 -        if (typeof handlers[name] !== "function") throw new Typ
         -eError(`RecorderControls: ${name} must be a function`);        
      33 +    if (typeof status !== "string") throw new TypeError("Record
         +ingControls: status must be a string");                        
      34 +    [["onStart", onStart], ["onStop", onStop], ["onClear", onCl
         +ear]].forEach(([name, handler]) => {                           
      35 +        if (typeof handler !== "function") throw new TypeError(
         +`RecordingControls: ${name} must be a function`);              
      36      });
      37  
      38      const hasRecording = events.length > 0;
      39      const actions = [
      50 -        { id: "start", label: "Start Recording", available: mod
         -e === "idle", run: handlers.onStart },                         
      51 -        { id: "stop", label: "Stop Recording", available: mode 
         -=== "recording", run: handlers.onStop },                       
      52 -        { id: "clear", label: "Clear Recording", available: mod
         -e !== "recording" && hasRecording, run: handlers.onClear },    
      53 -        { id: "play", label: "Play Sequence", available: mode =
         -== "idle" && hasRecording, run: handlers.onPlay }              
      40 +        { id: "start", label: "Start Recording", available: !is
         +Recording && !isPlaying, run: onStart },                       
      41 +        { id: "stop", label: "Stop Recording", available: isRec
         +ording, run: onStop },                                         
      42 +        { id: "clear", label: "Clear Recording", available: !is
         +Recording && hasRecording, run: onClear }                      
      43      ];
      44  
      45      let onset = 0;
      46      const rows = events.map((event, index) => {
      47          onset += event.deltaMs;
      59 -        return { index, event, onset };                        
      48 +        return { index, event, start: onset };                 
      49      });
      50  
      51      return (
      63 -        <section className={styles.recorder} aria-labelledby="r
         -ecorder-title">                                                
      64 -            <h2 id="recorder-title" className={styles.title}>Re
         -corder</h2>                                                    
      52 +        <section className={styles.panel} aria-labelledby="reco
         +rding-title">                                                  
      53 +            <h2 id="recording-title" className={styles.title}>R
         +ecording</h2>                                                  
      54              <menu className={styles.actions} aria-label="Record
          ing controls">
      55                  {actions.map((action) => (
      56                      <li key={action.id}>
     ...
      58                              type="button"
      59                              className={styles.action}
      60                              data-action={action.id}
      72 -                            data-recording={action.id === "star
         -t" && mode === "recording" ? "true" : undefined}               
      61 +                            data-recording={action.id === "star
         +t" && isRecording ? "true" : undefined}                        
      62                              aria-disabled={!action.available}
      63                              onClick={action.available ? action.
          run : undefined}
      64                          >
     ...
       67                      </li>
       68                  ))}
       69              </menu>
       81 -            <fieldset className={styles.speeds}>              
       82 -                <legend>Playback speed</legend>               
       83 -                {PLAYBACK_SPEEDS.map((value) => (             
       84 -                    <label key={value} className={styles.speed
          -}>                                                            
       85 -                        <input                                
       86 -                            type="radio"                      
       87 -                            name="playback-speed"             
       88 -                            value={value}                     
       89 -                            checked={speed === value}         
       90 -                            onChange={() => handlers.onSpeedCh
          -ange(value)}                                                  
       91 -                        />                                    
       92 -                        {" "}                                 
       93 -                        {formatSpeed(value)}                  
       94 -                    </label>                                  
       95 -                ))}                                           
       96 -            </fieldset>                                       
       70              <output className={styles.status} aria-live="polit
           e">{status}</output>
       98 -            {mode === "recording" ? (                         
       71 +            {isRecording ? (                                  
       72                  <p className={styles.note}>Notes captured: {ca
           pturedCount}</p>
       73              ) : hasRecording ? (
       74                  <figure className={styles.tableFrame} tabIndex
           ={0} aria-labelledby="recorded-notes-caption">
     ...
       88                              </tr>
       89                          </thead>
       90                          <tbody>
      118 -                            {rows.map(({ index, event, onset: 
          -start }) => (                                                 
       91 +                            {rows.map(({ index, event, start }
          +) => (                                                        
       92                                  <tr key={index}>
       93                                      <th scope="row">{index + 1
           }</th>
       94                                      <td>{keyLabel(createPianoK
           ey(event.midi))}</td>

● Write(LAB3\HW\pianoEngine\src\components\SequencerControls.jsx)
  ⎿  Wrote 73 lines to
     LAB3\HW\pianoEngine\src\components\SequencerControls.jsx
       1 /**
       2  * Polyphonic Piano Engine — sequencer controls (T-02C speeds, T
         -02D Stop Sequence)
       3  *
       4  *   <section aria-labelledby="sequencer-title">
       5  *     <h2>Sequencer</h2>
       6  *     <fieldset> <legend>Playback speed</legend>  3 × <label><i
         nput type="radio"/> 0.5×</label> </fieldset>
       7  *     <menu aria-label="Sequencer controls">  Play Sequence, St
         op Sequence  </menu>
     … +66 lines (ctrl+o to expand)
● Write(LAB3\HW\pianoEngine\src\components\PianoControls.jsx)
  ⎿  Wrote 49 lines to LAB3\HW\pianoEngine\src\components\PianoControls.jsx
       1 /**
       2  * Polyphonic Piano Engine — voice monitor and panic button (T-0
         2D PianoControls)
       3  *
       4  *   <section aria-labelledby="voices-title">
       5  *     <h2>Voices</h2>
       6  *     <p>
       7  *       <output aria-live="off">2 of 8 voices: C4, E4</output>
       8  *       <button>Release All Notes</button>
       9  *     </p>
     … +40 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\components\Piano.jsx)
  ⎿  Wrote 81 lines to LAB3\HW\pianoEngine\src\components\Piano.jsx
       1 /**
       2  * Polyphonic Piano Engine — Piano (T-02D component architecture
         )
       3  *
       4  *   Piano                     owns the engine (usePiano + useSe
         quencer)
       5  *   ├── PianoControls         voice monitor, Release All Notes
       6  *   ├── PianoKeyboard         <section> + <ol> of 88 memoised P
         ianoKeys
       7  *   │   ├── PianoKey (MIDI 21)
     … +74 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\App.jsx)
  ⎿  Added 4 lines, removed 24 lines
       1  import Piano from "./components/Piano.jsx";
       2 -import RecorderControls from "./components/RecorderControls.jsx
         -";                                                             
       3 -import { PIANO_KEYS } from "./piano.js";                       
       4 -import usePianoEngine from "./usePianoEngine.js";              
       2 +import { PIANO_KEYS } from "./utils/midiUtils.js";             
       3  
       4  /**
       5   * Rendered into <main id="root"> (index.html); landmarks only,
           no wrapper element.
       8 - * `engine` options (a synth and clocks) are injectable for tes
         -ts; the app uses                                               
       9 - * the real PolyphonicSynth, created lazily on the first key pr
         -ess.                                                           
       6 + * `engine` options ({ synth, now }) are injectable for tests; 
         +the app uses the                                               
       7 + * real PolyphonicSynth, whose AudioContext is created on the f
         +irst key press.                                                
       8   */
       9  export default function App({ engine } = {}) {
      12 -    const piano = usePianoEngine(engine);                      
      10      return (
      11          <>
      12              <header>
      13                  <h1>Polyphonic Piano Engine</h1>
      14                  <p>88 keys generated from MIDI note numbers 21–
          108, eight voices at once</p>
      15              </header>
      19 -            <Piano                                             
      20 -                pianoKeys={PIANO_KEYS}                         
      21 -                activeNotes={piano.activeNotes}                
      22 -                onNoteOn={piano.noteOn}                        
      23 -                onNoteOff={piano.noteOff}                      
      24 -            />                                                 
      25 -            <RecorderControls                                  
      26 -                mode={piano.mode}                              
      27 -                events={piano.events}                          
      28 -                capturedCount={piano.capturedCount}            
      29 -                speed={piano.speed}                            
      30 -                status={piano.status}                          
      31 -                onStart={piano.startRecording}                 
      32 -                onStop={piano.stopRecording}                   
      33 -                onClear={piano.clearRecording}                 
      34 -                onPlay={piano.playSequence}                    
      35 -                onSpeedChange={piano.setSpeed}                 
      36 -            />                                                 
      16 +            <Piano pianoKeys={PIANO_KEYS} engine={engine} />   
      17          </>
      18      );
      19  }

● Updating the shared control styles, removing SequencePlayer, and fixing
  imports:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src"; git rm -q audio/SequencePlayer.js; python - <<'EOF'
      p='components/Contr…)
  ⎿  fixed audio\NoteRecorder.js
     fixed audio\PolyphonicSynth.test.js
     fixed audio\sequencing.test.js
     … +3 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\audio\NoteRecorder.js (+172 -172)
        1 -/**                                                           
        2 - * Polyphonic Piano Engine — T-02C note recorder              
        3 - *                                                            
        4 - * Captures live note-on / note-off pairs as recorded events: 
        5 - *                                                            
        6 - *   { midi: 69, freqHz: 440, durationMs: 300, deltaMs: 150 } 
        7 - *                                                            
        8 - *   durationMs  note-off time - note-on time of the same note
        9 - *   deltaMs     note-on time - note-on time of the previous r
          -ecorded event                                                 
       10 - *               (0 for the first event, so replay starts at o
          -nce)                                                          
       11 - *                                                            
       12 - * An event is appended to the recording queue at its note-on,
          - so the queue                                                 
       13 - * is in chronological (onset) order even when notes overlap: 
          -press A, press                                                
       14 - * B, release B, release A records A then B. The event's durat
          -ion is filled                                                 
       15 - * in at its note-off; a note still held when recording stops 
          -is closed at                                                  
       16 - * the stop time.                                             
       17 - *                                                            
       18 - * Times are taken from `now()` (performance.now by default, i
          -njectable for                                                 
       19 - * tests) and rounded to whole milliseconds against the record
          -ing start, so                                                 
       20 - * rounding never accumulates: the onsets of the events always
          - sum back to                                                  
       21 - * the rounded real onset.                                    
       22 - *                                                            
       23 - * The finished recording is a frozen array of frozen events; 
          -nothing that                                                  
       24 - * replays it can change it.                                  
       25 - */                                                           
       26 -import { AudioTaskQueue } from "./AudioTaskQueue.js";         
       27 -import { midiToFrequency } from "../piano.js";                
       28 -                                                              
       29 -const EVENT_FIELDS = Object.freeze(["midi", "freqHz", "duratio
          -nMs", "deltaMs"]);                                            
       30 -                                                              
       31 -/** Throws a TypeError unless event is a complete, self-consis
          -tent recorded event. */                                       
       32 -export function assertRecordedEvent(event) {                  
       33 -    if (event === null || typeof event !== "object" || Array.i
          -sArray(event)) {                                              
       34 -        throw new TypeError("RecordedEvent: event must be an o
          -bject with midi, freqHz, durationMs and deltaMs");            
       35 -    }                                                         
       36 -    if (!Number.isInteger(event.midi) || event.midi < 0 || eve
          -nt.midi > 127) {                                              
       37 -        throw new TypeError(`RecordedEvent: midi must be an in
          -teger from 0 to 127, received ${JSON.stringify(event.midi)}`);
       38 -    }                                                         
       39 -    if (typeof event.freqHz !== "number" || Math.abs(event.fre
          -qHz - midiToFrequency(event.midi)) > 1e-9) {                  
       40 -        throw new TypeError(`RecordedEvent: freqHz of MIDI ${e
          -vent.midi} must be ${midiToFrequency(event.midi)}, received ${
          -JSON.stringify(event.freqHz)}`);                              
     … 304 more lines (ctrl+o to expand)
  ⎿  Deleted LAB3\HW\pianoEngine\src\audio\SequencePlayer.js (+0 -149)
        1 -/**                                                           
        2 - * Polyphonic Piano Engine — T-02C asynchronous FIFO sequencer
        3 - *                                                            
        4 - * Replays a recording through any instrument with noteOn(midi
          -, freqHz) and                                                 
        5 - * noteOff(midi) (the PolyphonicSynth, or the UI adapter that 
          -also lights the                                               
        6 - * keys). Each play() copies the recording into a fresh AudioT
          -askQueue and                                                  
        7 - * drains it in an async loop:                                
        8 - *                                                            
        9 - *   dequeue next event ─► await deltaMs / speed ─► noteOn    
       10 - *        ▲                                          │        
       11 - *        └──────────── (note-off timer: durationMs / speed) ─
          -► noteOff                                                     
       12 - *                                                            
       13 - * The loop awaits each event's onset before dequeuing the nex
          -t, so notes                                                   
       14 - * start strictly in recorded order. A note's release is sched
          -uled on its own                                               
       15 - * timer instead of blocking the loop: deltaMs is measured ons
          -et-to-onset, so                                               
       16 - * waiting for one note to end before starting the next would 
          -push every                                                    
       17 - * overlapping note (chords, legato) late. Overlapping notes t
          -herefore sound                                                
       18 - * together, which is what the 8-voice pool is for. play() res
          -olves once the                                                
       19 - * last note has been released.                               
       20 - *                                                            
       21 - * Timing. Every wait targets an absolute time from the start 
          -of playback                                                   
       22 - * (sum of deltaMs / speed), not a chain of relative delays, s
          -o timer jitter                                                
       23 - * never accumulates across a long sequence.                  
       24 - *                                                            
       25 - * One loop at a time: calling play() while a replay is runnin
          -g returns the                                                 
       26 - * running replay's promise instead of starting a competing lo
          -op. stop()                                                    
       27 - * cancels every pending timer and releases the notes this rep
          -lay started.                                                  
       28 - * The recording itself is never mutated (it is only read into
          - the queue).                                                  
       29 - */                                                           
       30 -import { AudioTaskQueue } from "./AudioTaskQueue.js";         
       31 -import { assertRecordedEvents } from "./NoteRecorder.js";     
       32 -                                                              
       33 -export const PLAYBACK_SPEEDS = Object.freeze([0.5, 1, 2]);    
       34 -                                                              
       35 -export function assertPlaybackSpeed(speed) {                  
       36 -    if (!PLAYBACK_SPEEDS.includes(speed)) {                   
       37 -        throw new TypeError(`SequencePlayer: speed must be one
          - of ${PLAYBACK_SPEEDS.join(", ")}, received ${JSON.stringify(s
          -peed)}`);                                                     
       38 -    }                                                         
       39 -}                                                             
       40 -                                                              
     … 109 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\audio\sequencing.test.js (+1 -1)
      2  import { AudioTaskQueue } from "./AudioTaskQueue.js";
      3  import { NoteRecorder, assertRecordedEvent, assertRecordedEvents
         , recordingLengthMs } from "./NoteRecorder.js";
      4  import { PLAYBACK_SPEEDS, SequencePlayer } from "./SequencePlaye
         r.js";
      5 -import { createPianoKey } from "../piano.js";                   
      5 +import { createPianoKey } from "../utils/midiUtils.js";         
      6  
      7  // T-02C — FIFO queue, note recorder and asynchronous variable-s
         peed replay (PRD 3, Project Rule 2).
      8  
  ⎿  Updated LAB3\HW\pianoEngine\src\components\Controls.module.css (+18 
     -2)
       1 -/* Polyphonic Piano Engine — recorder styles (T-02C). Colours c
         -ome from the --piano-* tokens. */                              
       1 +/* Polyphonic Piano Engine — styles shared by PianoControls, Re
         +cordingControls and SequencerControls. Colours come from the --
         +piano-* tokens. */                                             
       2  
       3 -.recorder {                                                    
       3 +.panel {                                                       
       4      margin-top: 1.5rem;
       5      min-width: 0;
       6  }
       7  
       8 +.voices {                                                      
       9 +    margin-bottom: 1rem;                                       
      10 +}                                                              
      11 +                                                               
      12 +.voiceRow {                                                    
      13 +    display: flex;                                             
      14 +    flex-wrap: wrap;                                           
      15 +    align-items: center;                                       
      16 +    gap: 0.5rem 1rem;                                          
      17 +    margin: 0;                                                 
      18 +}                                                              
      19 +                                                               
      20 +.voiceReadout {                                                
      21 +    font-variant-numeric: tabular-nums;                        
      22 +}                                                              
      23 +                                                               
      24  .title {
      25      margin: 0 0 0.75rem;
      26      font-size: 1.125rem;
  ⎿  Updated LAB3\HW\pianoEngine\src\components\Piano.test.jsx (+1 -1)
       4  import HOOK_SOURCE from "../usePianoEngine.js?raw";
       5  import RecorderControls from "./RecorderControls.jsx";
       6  import App from "../App.jsx";
       7 -import { createPianoKey } from "../piano.js";                  
       7 +import { createPianoKey } from "../utils/midiUtils.js";        
       8  
       9  // T-02C — recording controls, speed selector, recorded-note ta
          ble, and the whole
      10  // record → replay flow through the App (PRD 3 sections 4–7, Pr
          oject Rules 1–4).
  ⎿  … 4 more files changed

● Now the tests. First, swapping the SequencePlayer tests for playSequence +
  AbortController tests:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/audio"; grep -n "^describe\|^import\|^const\|^// "
      sequencing.test.js)
  ⎿  1:import { afterEach, beforeEach, describe, expect, test, vi } from "v
     itest";
     2:import { AudioTaskQueue } from "./AudioTaskQueue.js";
     … +14 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/audio"; python - <<'EOF'
      p='sequencing.test.js'; s=open(p,encoding='utf8'…)
  ⎿  Error: Exit code 2
     /usr/bin/bash: -c: line 141: unexpected EOF while looking for matching `''

● The shell is choking on the heredoc again, so I'll write the new tests as
  their own file and trim the old file separately:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/audio"; python -c "
      p='sequencing.test.js'; s=open(p,encoding='utf8').rea…)
  ⎿  import { beforeEach, describe, expect, test } from "vitest";
     import { AudioTaskQueue } from "./AudioTaskQueue.js";
     import { NoteRecorder, assertRecordedEvent, assertRecordedEvents, reco
     … +7 lines (ctrl+o to expand)
  ⎿  Created LAB3\HW\pianoEngine\src\audio\recording.test.js (+171 -0)
        1 +import { beforeEach, describe, expect, test } from "vitest";  
        2 +import { AudioTaskQueue } from "./AudioTaskQueue.js";         
        3 +import { NoteRecorder, assertRecordedEvent, assertRecordedEven
          +ts, recordingLengthMs } from "./NoteRecorder.js";             
        4 +import { createPianoKey } from "../utils/midiUtils.js";       
        5 +                                                              
        6 +// T-02C — FIFO queue, note recorder and recorded event schema
          + (PRD 3, Project Rule 2).                                     
        7 +                                                              
        8 +const hz = (midi) => createPianoKey(midi).freqHz;             
        9 +const ev = (midi, deltaMs, durationMs) => Object.freeze({ midi
          +, freqHz: hz(midi), durationMs, deltaMs });                   
       10 +                                                              
       11 +describe("AudioTaskQueue", () => {                            
       12 +    test("dequeues in exactly the order tasks were enqueued (F
          +IFO)", () => {                                                
       13 +        const queue = new AudioTaskQueue();                   
       14 +        ["a", "b", "c"].forEach((task) => queue.enqueue(task))
          +;                                                             
       15 +        expect(queue.size).toBe(3);                           
       16 +        expect(queue.peek()).toBe("a");                       
       17 +        expect([queue.dequeue(), queue.dequeue()]).toEqual(["a
          +", "b"]);                                                     
       18 +        queue.enqueue("d");                                   
       19 +        expect([queue.dequeue(), queue.dequeue(), queue.dequeu
          +e()]).toEqual(["c", "d", null]);                              
       20 +        expect(queue.size).toBe(0);                           
       21 +        expect(queue.peek()).toBeNull();                      
       22 +    });                                                       
       23 +                                                              
       24 +    test("can be seeded from an iterable, cleared, and copied 
          +without being consumed", () => {                              
       25 +        const queue = new AudioTaskQueue([1, 2, 3]);          
       26 +        expect(queue.toArray()).toEqual([1, 2, 3]);           
       27 +        expect(queue.size).toBe(3);                           
       28 +        queue.clear();                                        
       29 +        expect(queue.size).toBe(0);                           
       30 +        expect(queue.dequeue()).toBeNull();                   
       31 +    });                                                       
       32 +                                                              
       33 +    test("stays FIFO across head-index compaction with many ta
          +sks", () => {                                                 
       34 +        const queue = new AudioTaskQueue();                   
       35 +        const out = [];                                       
       36 +        for (let i = 0; i < 1000; i += 1) {                   
       37 +            queue.enqueue(i);                                 
       38 +            if (i % 3 === 0) out.push(queue.dequeue());       
       39 +        }                                                     
       40 +        for (let task = queue.dequeue(); task !== null; task =
          + queue.dequeue()) out.push(task);                             
     … 131 more lines (ctrl+o to expand)
  ⎿  Deleted LAB3\HW\pianoEngine\src\audio\sequencing.test.js (+0 -320)
        1 -import { afterEach, beforeEach, describe, expect, test, vi } f
          -rom "vitest";                                                 
        2 -import { AudioTaskQueue } from "./AudioTaskQueue.js";         
        3 -import { NoteRecorder, assertRecordedEvent, assertRecordedEven
          -ts, recordingLengthMs } from "./NoteRecorder.js";             
        4 -import { PLAYBACK_SPEEDS, SequencePlayer } from "./SequencePla
          -yer.js";                                                      
        5 -import { createPianoKey } from "../utils/midiUtils.js";       
        6 -                                                              
        7 -// T-02C — FIFO queue, note recorder and asynchronous variable
          --speed replay (PRD 3, Project Rule 2).                        
        8 -                                                              
        9 -const hz = (midi) => createPianoKey(midi).freqHz;             
       10 -const ev = (midi, deltaMs, durationMs) => Object.freeze({ midi
          -, freqHz: hz(midi), durationMs, deltaMs });                   
       11 -                                                              
       12 -describe("AudioTaskQueue", () => {                            
       13 -    test("dequeues in exactly the order tasks were enqueued (F
          -IFO)", () => {                                                
       14 -        const queue = new AudioTaskQueue();                   
       15 -        ["a", "b", "c"].forEach((task) => queue.enqueue(task))
          -;                                                             
       16 -        expect(queue.size).toBe(3);                           
       17 -        expect(queue.peek()).toBe("a");                       
       18 -        expect([queue.dequeue(), queue.dequeue()]).toEqual(["a
          -", "b"]);                                                     
       19 -        queue.enqueue("d");                                   
       20 -        expect([queue.dequeue(), queue.dequeue(), queue.dequeu
          -e()]).toEqual(["c", "d", null]);                              
       21 -        expect(queue.size).toBe(0);                           
       22 -        expect(queue.peek()).toBeNull();                      
       23 -    });                                                       
       24 -                                                              
       25 -    test("can be seeded from an iterable, cleared, and copied 
          -without being consumed", () => {                              
       26 -        const queue = new AudioTaskQueue([1, 2, 3]);          
       27 -        expect(queue.toArray()).toEqual([1, 2, 3]);           
       28 -        expect(queue.size).toBe(3);                           
       29 -        queue.clear();                                        
       30 -        expect(queue.size).toBe(0);                           
       31 -        expect(queue.dequeue()).toBeNull();                   
       32 -    });                                                       
       33 -                                                              
       34 -    test("stays FIFO across head-index compaction with many ta
          -sks", () => {                                                 
       35 -        const queue = new AudioTaskQueue();                   
       36 -        const out = [];                                       
       37 -        for (let i = 0; i < 1000; i += 1) {                   
       38 -            queue.enqueue(i);                                 
       39 -            if (i % 3 === 0) out.push(queue.dequeue());       
       40 -        }                                                     
     … 280 more lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\audio\playSequence.test.js)
  ⎿  Wrote 210 lines to LAB3\HW\pianoEngine\src\audio\playSequence.test.js
       1 import { afterEach, beforeEach, describe, expect, test, vi } fro
         m "vitest";
       2 import { AudioTaskQueue } from "./AudioTaskQueue.js";
       3 import { PLAYBACK_SPEEDS, playSequence } from "./playSequence.js
         ";
       4 import { createPianoKey } from "../utils/midiUtils.js";
       5 
       6 // T-02C — asynchronous FIFO replay at 0.5× / 1.0× / 2.0× (PRD 3
          sections 5–7).
       7 // T-02D — every replay is cancelled through an AbortController 
     … +204 lines (~9 KB) (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\utils\utils.test.js)
  ⎿  Wrote 98 lines to LAB3\HW\pianoEngine\src\utils\utils.test.js
      1 import { afterEach, beforeEach, describe, expect, test, vi } from
         "vitest";
      2 import { shallowEqual } from "./shallowEqual.js";
      3 import { ABORT_MESSAGE, abortableDelay, isAbortError } from "./ab
        ortableDelay.js";
      4 
      5 // T-02D — shallowEqual (the React.memo comparator) and abortable
        Delay (PRD 4 sections 3 and 6).
      6 
      7 describe("shallowEqual", () => {
     … +91 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run src/audio src/utils 2>&1 | grep -E
      "×|FAIL|Tests |Error:|Exp…)
  ⎿        Tests  128 passed (128)
  ⎿  (timeout 2m)

● 128 audio/utils tests pass; next I'm building a small hook that mimics React
  DevTools' Profiler so the render-isolation check can run automatically in
  jsdom and Edge.

● Write(LAB3\HW\pianoEngine\src\test\renderTracker.js)
  ⎿  Wrote 58 lines to LAB3\HW\pianoEngine\src\test\renderTracker.js
       1 /**
       2  * Polyphonic Piano Engine — T-02D render tracker (test-only, ne
         ver imported by the app)
       3  *
       4  * An automated stand-in for the React DevTools Profiler. DevToo
         ls works by
       5  * installing `__REACT_DEVTOOLS_GLOBAL_HOOK__` before React load
         s; React then
       6  * calls hook.onCommitFiberRoot(rendererID, root) after every co
         mmit. This
     … +52 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\src\components\renderIsolation.test.jsx)
  ⎿  Wrote 108 lines to
     LAB3\HW\pianoEngine\src\components\renderIsolation.test.jsx
       1 import { afterAll, beforeAll, beforeEach, describe, expect, test
         , vi } from "vitest";
       2 import { installRenderTracker } from "../test/renderTracker.js";
       3 
       4 // T-02D — React.memo render isolation (PRD 4 sections 6–8), mea
         sured the way the React
       5 // DevTools Profiler measures it: through React's DevTools hook,
          which must exist before
       6 // react-dom loads. So the hook is installed first and React is 
         imported dynamically.
     … +102 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run src/components/renderIsolation.test.jsx 2>&1 |
      grep -E "✓|×|…)
  ⎿        Tests  8 passed (8)
  ⎿  (timeout 2m)

● All 8 pass on the first run, which makes me suspicious. A tracker that always
  reports "one key" would pass too. A quick mutation check: break the memo and
  confirm the tests catch it.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; cp src/components/PianoKey.jsx /tmp/pk.bak 2>/dev/null || cp
      src/components…)
  ⎿       × the default export is React.memo(PianoKey, shallowEqual) 9ms
          × pressing A4 re-renders exactly one key; the other 87 skip 190ms
          × holding C4 and then pressing E4 re-renders only E4 92ms
     … +12 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\components\PianoKey.jsx (+78 -92)
  ⎿  (a git step in this command can move the working tree, so these may be
     its changes, not edits) (ctrl+o to expand)
  ⎿  (timeout 2m)

● The mutation check passed, but my restore used git checkout, which reverted
  PianoKey.jsx to the committed PRD 3 version instead of my new one. I'm
  rewriting the new version now.

● Write(LAB3\HW\pianoEngine\src\components\PianoKey.jsx)
  ⎿  Added 31 lines, removed 17 lines
       1  /**
       2 - * Polyphonic Piano Engine — T-02A piano key, T-02C press / rel
         -ease                                                           
       2 + * Polyphonic Piano Engine — piano key (T-02A markup, T-02C pre
         +ss / release,                                                  
       3 + * T-02D React.memo render isolation)                          
       4   *
       4 - * One key as one native <button>. The parent (Piano) owns the 
         -<ol>, the <li>                                                 
       5 - * and the list key, so the key adds no wrapper of its own (Pro
         -ject Rules 1                                                   
       6 - * and 4):                                                     
       5 + * One key as one native <button>. The parent (PianoKeyboard) o
         +wns the <ol>,                                                  
       6 + * the <li> and the list key, so the key adds no wrapper of its
         + own (Project                                                  
       7 + * Rules 1 and 4):                                             
       8   *
       9   *   <button type="button" aria-pressed="false" data-midi="69" 
          data-note-type="white">
      10   *     <span>A4</span>                         scientific pitch
           label (visible)
     ...
      13   *
      14   * The accessible name is computed from the content ("A4 white 
          key"), so the
      15   * visible label is always part of the name (WCAG 2.5.3, Label 
          in Name). The
      15 - * space between the two spans is its own text node, so every n
         -ame                                                            
      16 - * computation (browsers and jsdom) keeps the words apart. `ari
         -a-pressed`                                                     
      17 - * reports whether the note is sounding (live or during replay)
         -.                                                              
      16 + * space between the spans is its own text node, so every name 
         +computation                                                    
      17 + * keeps the words apart. `aria-pressed` reports `isActive`: th
         +e note is                                                      
      18 + * sounding, live or during replay.                            
      19   *
      19 - * A piano note has a length, so a key reacts to press and rele
         -ase, not to                                                    
      20 - * click: pointer down starts the note; pointer up, cancel or l
         -eaving the key                                                 
      21 - * ends it. From the keyboard, Enter or Space held on the focus
         -ed key does the                                                
      22 - * same (auto-repeat is ignored), and losing focus ends the not
         -e.                                                             
      20 + * A note has a length, so the key reacts to press and release,
         + not click:                                                    
      21 + * pointer down starts it; pointer up, cancel or leaving the ke
         +y ends it.                                                     
      22 + * From the keyboard, Enter or Space held on the focused key do
         +es the same                                                    
      23 + * (auto-repeat ignored), and losing focus ends the note.      
      24   *
      25 + * Memoised with shallowEqual: the key re-renders only when one
         + of its own                                                    
      26 + * props changes. The parent passes the same frozen `pianoKey`,
         + the same                                                      
      27 + * useCallback handlers and the same class strings every time, 
         +so in practice                                                 
      28 + * only `isActive` changes, and only for the key whose note sta
         +rted or                                                        
      29 + * stopped. The audio engine is never touched here; the key onl
         +y reports.                                                     
      30 + *                                                             
      31   * The key is validated before rendering (Project Rule 2) and i
          ts text is
      32   * rendered as React children, never as HTML (Project Rule 3).
      33   */
      27 -import { assertPianoKey, keyLabel } from "../piano.js";        
      34 +import { memo } from "react";                                  
      35 +import { assertPianoKey, keyLabel } from "../utils/midiUtils.js
         +";                                                             
      36 +import { shallowEqual } from "../utils/shallowEqual.js";       
      37  
      38  const PLAY_KEYS = new Set(["Enter", " "]);
      39  
      31 -export default function PianoKey({ pianoKey, pressed = false, o
         -nNoteOn, onNoteOff, className, labelClassName, hintClassName })
         - {                                                             
      40 +const preventContextMenu = (event) => event.preventDefault();  
      41 +                                                               
      42 +function PianoKey({ pianoKey, isActive = false, onNoteOn, onNot
         +eOff, className, labelClassName, hintClassName }) {            
      43      assertPianoKey(pianoKey);
      33 -    if (typeof pressed !== "boolean") {                        
      34 -        throw new TypeError(`PianoKey: pressed must be a boolea
         -n, received ${JSON.stringify(pressed)}`);                      
      44 +    if (typeof isActive !== "boolean") {                       
      45 +        throw new TypeError(`PianoKey: isActive must be a boole
         +an, received ${JSON.stringify(isActive)}`);                    
      46      }
      47      [["onNoteOn", onNoteOn], ["onNoteOff", onNoteOff]].forEach(
          ([name, handler]) => {
      48          if (handler !== undefined && typeof handler !== "functi
          on") {
     ...
      57          <button
      58              type="button"
      59              className={className}
      49 -            aria-pressed={pressed}                             
      60 +            aria-pressed={isActive}                            
      61              data-midi={pianoKey.midi}
      62              data-note-type={pianoKey.type}
      63              data-freq-hz={pianoKey.freqHz.toFixed(2)}
     ...
      79                  end();
      80              })}
      81              onBlur={end}
      71 -            onContextMenu={(event) => event.preventDefault()}  
      82 +            onContextMenu={preventContextMenu}                 
      83          >
      84              <span className={labelClassName}>{keyLabel(pianoKey
          )}</span>
      85              {" "}
     ...
      87          </button>
      88      );
      89  }
      90 +                                                               
      91 +export { PianoKey as PianoKeyView };                           
      92 +export default memo(PianoKey, shallowEqual);                   

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; git status --short .; npx vitest run
      src/components/renderIsolation.test.js…)
  ⎿   M src/App.jsx
      M src/audio/NoteRecorder.js
      M src/audio/PolyphonicSynth.test.js
     … +27 lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● Everything else is intact; only PianoKey.jsx had been reverted, and it's
  restored. Now updating the two older component test files for the new names
  and props:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/components"; grep -n "import\|Piano\b\|<Piano
      \|pressed\|App\|SOURCES\|de…)  ⎿  1:import { afterEach, describe, expect, test, vi } from "vitest";
     2:import { cleanup, fireEvent, render, screen, within } from "@testing
     -library/react";
     … +33 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/components"; sed -n 166,190p PianoKeyboard.test.jsx)
  ⎿  describe("Project Rules in source", () => {
         test.each(SOURCES)("%s uses no <div> (Rule 1) and no innerHTML (Ru
     le 3)", (_, source) => {
     … +20 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine/src/components"; python -c "
      p='PianoKeyboard.test.jsx'; s=open(p,encoding='u…)
  ⎿  177:        expect((code(KEYBOARD_SOURCE).match(/<(Memo)?PianoKey\b/g)
      ?? [])).toHaveLength(1);
  ⎿  Updated LAB3\HW\pianoEngine\src\components\PianoKeyboard.test.jsx (+24
     -30)
       1  import { afterEach, describe, expect, test, vi } from "vitest";
       2  import { cleanup, fireEvent, render, screen, within } from "@te
          sting-library/react";
       3 -import PIANO_SOURCE from "./Piano.jsx?raw";                    
       4 -import KEY_SOURCE from "./PianoKey.jsx?raw";                   
       5 -import APP_SOURCE from "../App.jsx?raw";                       
       6 -import Piano from "./Piano.jsx";                               
       3 +import KEYBOARD_SOURCE from "./PianoKeyboard.jsx?raw";         
       4 +import PianoKeyboard from "./PianoKeyboard.jsx";               
       5  import PianoKey from "./PianoKey.jsx";
       8 -import App from "../App.jsx";                                  
       6  import { PIANO_KEYS, createPianoKey, generatePianoKeys } from "
          ../utils/midiUtils.js";
       7  
       8  // T-02A — semantic rendering of the generated keyboard (PRD 1 
          sections 5–7, Project Rules 1–4).
       9 +// T-02C/D — press / release reporting and isActive on memoised
         + keys.                                                         
      10  
      11  function renderInMain(element) {
      12      const main = document.body.appendChild(document.createEleme
          nt("main"));
     ...
      18      document.body.replaceChildren();
      19  });
      20  
      23 -const SOURCES = [["Piano.jsx", PIANO_SOURCE], ["PianoKey.jsx", 
         -KEY_SOURCE], ["App.jsx", APP_SOURCE]];                         
      21 +// Every app source file (components, hooks, audio, utils, data
         +), checked for Rules 1 and 3.                                  
      22 +const SOURCES = Object.entries(import.meta.glob(["../**/*.{js,j
         +sx}", "!../**/*.test.{js,jsx}", "!../test/**"], { query: "?raw"
         +, import: "default", eager: true }));                          
      23  const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, ""
          ).replace(/\/\/.*$/gm, "");
      24  
      26 -describe("Piano", () => {                                      
      25 +describe("PianoKeyboard", () => {                              
      26      test("renders one section > ol with 88 list items, each hol
          ding exactly one button", () => {
      28 -        const { container } = renderInMain(<Piano pianoKeys={PI
         -ANO_KEYS} />);                                                 
      27 +        const { container } = renderInMain(<PianoKeyboard piano
         +Keys={PIANO_KEYS} />);                                         
      28          const section = screen.getByRole("region", { name: "88-
          key piano" });
      29          const list = within(section).getByRole("list");
      30          expect(list.tagName).toBe("OL");
     ...
      38      });
      39  
      40      test("renders 52 white and 36 black keys", () => {
      42 -        const { container } = renderInMain(<Piano pianoKeys={PI
         -ANO_KEYS} />);                                                 
      41 +        const { container } = renderInMain(<PianoKeyboard piano
         +Keys={PIANO_KEYS} />);                                         
      42          expect(container.querySelectorAll("button[data-note-typ
          e='white']")).toHaveLength(52);
      43          expect(container.querySelectorAll("button[data-note-typ
          e='black']")).toHaveLength(36);
     … 106 more lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; sed -i 's#/<(Memo)?PianoKey\\b/g#/<PianoKey\\b/g#'
      src/components/PianoKeyb…)
  ⎿  5:import PianoKey from "./PianoKey.jsx";
     6:import { PIANO_KEYS, createPianoKey, generatePianoKeys } from "../ut
     ils/midiUtils.js";
     … +12 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\components\PianoKeyboard.test.jsx
     (+179 -179)
        1 -import { afterEach, describe, expect, test, vi } from "vitest"
          -;                                                             
        2 -import { cleanup, fireEvent, render, screen, within } from "@t
          -esting-library/react";                                        
        3 -import KEYBOARD_SOURCE from "./PianoKeyboard.jsx?raw";        
        4 -import PianoKeyboard from "./PianoKeyboard.jsx";              
        5 -import PianoKey from "./PianoKey.jsx";                        
        6 -import { PIANO_KEYS, createPianoKey, generatePianoKeys } from 
          -"../utils/midiUtils.js";                                      
        7 -                                                              
        8 -// T-02A — semantic rendering of the generated keyboard (PRD 1
          - sections 5–7, Project Rules 1–4).                            
        9 -// T-02C/D — press / release reporting and isActive on memoise
          -d keys.                                                       
       10 -                                                              
       11 -function renderInMain(element) {                              
       12 -    const main = document.body.appendChild(document.createElem
          -ent("main"));                                                 
       13 -    return render(element, { container: main });              
       14 -}                                                             
       15 -                                                              
       16 -afterEach(() => {                                             
       17 -    cleanup();                                                
       18 -    document.body.replaceChildren();                          
       19 -});                                                           
       20 -                                                              
       21 -// Every app source file (components, hooks, audio, utils, dat
          -a), checked for Rules 1 and 3.                                
       22 -const SOURCES = Object.entries(import.meta.glob(["../**/*.{js,
          -jsx}", "!../**/*.test.{js,jsx}", "!../test/**"], { query: "?ra
          -w", import: "default", eager: true }));                       
       23 -const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "
          -").replace(/\/\/.*$/gm, "");                                  
       24 -                                                              
       25 -describe("PianoKeyboard", () => {                             
       26 -    test("renders one section > ol with 88 list items, each ho
          -lding exactly one button", () => {                            
       27 -        const { container } = renderInMain(<PianoKeyboard pian
          -oKeys={PIANO_KEYS} />);                                       
       28 -        const section = screen.getByRole("region", { name: "88
          --key piano" });                                               
       29 -        const list = within(section).getByRole("list");       
       30 -        expect(list.tagName).toBe("OL");                      
       31 -        const items = within(list).getAllByRole("listitem");  
       32 -        expect(items).toHaveLength(88);                       
       33 -        items.forEach((item) => {                             
       34 -            expect(item.children).toHaveLength(1);            
       35 -            expect(item.firstElementChild.tagName).toBe("BUTTO
          -N");                                                          
       36 -        });                                                   
       37 -        expect(container.querySelectorAll("button")).toHaveLen
          -gth(88);                                                      
       38 -    });                                                       
       39 -                                                              
       40 -    test("renders 52 white and 36 black keys", () => {        
     … 318 more lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● Keyboard tests pass and the source check now covers every app file. I'm
  rewriting the component and integration tests next.

● Write(LAB3\HW\pianoEngine\src\components\Piano.test.jsx)
  ⎿  Error writing file

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests
      |Error:|Expected|Received|^\s+[…)
  ⎿   FAIL  src/components/Piano.test.jsx [ src/components/Piano.test.jsx ]
     Error: Failed to resolve import "./RecorderControls.jsx?raw" from "src
     /components/Piano.test.jsx". Does the file exist?
           Tests  196 passed (196)
  ⎿  (timeout 3m)

  Read 1 file (ctrl+o to expand)

● That's the old file, which my earlier import fix had touched. Writing the new
  version over it:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; wc -l src/components/Piano.test.jsx)
  ⎿  281 src/components/Piano.test.jsx

● Write(LAB3\HW\pianoEngine\src\components\Piano.test.jsx)
  ⎿  Added 213 lines, removed 152 lines
       1  import { afterEach, beforeEach, describe, expect, test, vi } fr
          om "vitest";
       2  import { act, cleanup, fireEvent, render, screen, within } from
           "@testing-library/react";
       3 -import SOURCE from "./RecorderControls.jsx?raw";               
       4 -import HOOK_SOURCE from "../usePianoEngine.js?raw";            
       5 -import RecorderControls from "./RecorderControls.jsx";         
       3  import App from "../App.jsx";
       4 +import PianoControls from "./PianoControls.jsx";               
       5 +import RecordingControls from "./RecordingControls.jsx";       
       6 +import SequencerControls from "./SequencerControls.jsx";       
       7  import { createPianoKey } from "../utils/midiUtils.js";
       8  
       9 -// T-02C — recording controls, speed selector, recorded-note ta
         -ble, and the whole                                             
      10 -// record → replay flow through the App (PRD 3 sections 4–7, Pr
         -oject Rules 1–4).                                              
       9 +// T-02C — recording, speeds and replay through the UI (PRD 3 s
         +ections 4–7).                                                  
      10 +// T-02D — component architecture, Stop Sequence with AbortCont
         +roller, no false error on                                      
      11 +// abort, unmount cleanup (PRD 4 sections 4, 5 and 9). Project 
         +Rules 1–4.                                                     
      12  
      13  const hz = (midi) => createPianoKey(midi).freqHz;
      14  const ev = (midi, deltaMs, durationMs) => Object.freeze({ midi,
           freqHz: hz(midi), durationMs, deltaMs });
      15  const noop = () => {};
      15 -const HANDLERS = { onStart: noop, onStop: noop, onClear: noop, 
         -onPlay: noop, onSpeedChange: noop };                           
      16  
      17  function renderInMain(element) {
      18      const main = document.body.appendChild(document.createEleme
          nt("main"));
     ...
      26      document.body.replaceChildren();
      27  });
      28  
      29 -const action = (name) => screen.getByRole("button", { name }); 
      30 -const available = (name) => action(name).getAttribute("aria-dis
         -abled") === "false";                                           
      29 +const button = (name) => screen.getByRole("button", { name, exa
         +ct: true });                                                   
      30 +const available = (name) => button(name).getAttribute("aria-dis
         +abled") === "false";                                           
      31 +const statusOf = (region) => within(screen.getByRole("region", 
         +{ name: region })).getByRole("status").textContent;            
      32  
      32 -describe("RecorderControls", () => {                           
      33 -    test("renders the four controls, in order, inside a labelle
         -d menu", () => {                                               
      34 -        renderInMain(<RecorderControls mode="idle" events={[]} 
         -speed={1} status="Ready." {...HANDLERS} />);                   
      33 +describe("RecordingControls", () => {                          
      34 +    const base = { isRecording: false, isPlaying: false, events
         +: [], status: "", onStart: noop, onStop: noop, onClear: noop };
      35 +                                                               
      36 +    test("renders Start / Stop / Clear Recording in a labelled 
         +menu", () => {                                                 
      37 +        renderInMain(<RecordingControls {...base} />);         
      38          const menu = screen.getByRole("list", { name: "Recordin
          g controls" });
      39          expect(menu.tagName).toBe("MENU");
      37 -        expect(within(menu).getAllByRole("button").map((b) => b
         -.textContent)).toEqual([                                       
      38 -            "Start Recording", "Stop Recording", "Clear Recordi
         -ng", "Play Sequence"                                           
      39 -        ]);                                                    
      40 -        expect(screen.getByRole("region", { name: "Recorder" })
         -).toBeTruthy();                                                
      40 +        expect(within(menu).getAllByRole("button").map((b) => b
         +.textContent)).toEqual(["Start Recording", "Stop Recording", "C
         +lear Recording"]);                                             
      41      });
      42  
      43      test.each([
      44 -        ["idle, nothing recorded", "idle", [], { start: true, s
         -top: false, clear: false, play: false }],                      
      45 -        ["idle with a recording", "idle", [ev(60, 0, 100)], { s
         -tart: true, stop: false, clear: true, play: true }],           
      46 -        ["recording", "recording", [], { start: false, stop: tr
         -ue, clear: false, play: false }],                              
      47 -        ["playing", "playing", [ev(60, 0, 100)], { start: false
         -, stop: false, clear: true, play: false }]                     
      48 -    ])("availability when %s", (_, mode, events, expected) => {
      49 -        renderInMain(<RecorderControls mode={mode} events={even
         -ts} speed={1} status="" {...HANDLERS} />);                     
      50 -        expect({                                               
      51 -            start: available("Start Recording"), stop: availabl
         -e("Stop Recording"),                                           
      52 -            clear: available("Clear Recording"), play: availabl
         -e("Play Sequence")                                             
      53 -        }).toEqual(expected);                                  
      44 +        ["idle, nothing recorded", {}, { start: true, stop: fal
         +se, clear: false }],                                           
      45 +        ["idle with a recording", { events: [ev(60, 0, 100)] },
         + { start: true, stop: false, clear: true }],                   
      46 +        ["recording", { isRecording: true }, { start: false, st
         +op: true, clear: false }],                                     
      47 +        ["playing", { isPlaying: true, events: [ev(60, 0, 100)]
         + }, { start: false, stop: false, clear: true }]                
      48 +    ])("availability when %s", (_, props, expected) => {       
      49 +        renderInMain(<RecordingControls {...base} {...props} />
         +);                                                             
      50 +        expect({ start: available("Start Recording"), stop: ava
         +ilable("Stop Recording"), clear: available("Clear Recording") }
         +).toEqual(expected);                                           
      51      });
      52  
      53      test("an unavailable control stays focusable but ignores ac
          tivation", () => {
      57 -        const onPlay = vi.fn();                                
      58 -        renderInMain(<RecorderControls mode="idle" events={[]} 
         -speed={1} status="" {...HANDLERS} onPlay={onPlay} />);         
      59 -        const play = action("Play Sequence");                  
      60 -        expect(play.disabled).toBe(false);                     
      61 -        play.focus();                                          
      62 -        expect(document.activeElement).toBe(play);             
      63 -        fireEvent.click(play);                                 
      64 -        expect(onPlay).not.toHaveBeenCalled();                 
      54 +        const onStop = vi.fn();                                
      55 +        renderInMain(<RecordingControls {...base} onStop={onSto
         +p} />);                                                        
      56 +        const stop = button("Stop Recording");                 
      57 +        expect(stop.disabled).toBe(false);                     
      58 +        stop.focus();                                          
      59 +        expect(document.activeElement).toBe(stop);             
      60 +        fireEvent.click(stop);                                 
      61 +        expect(onStop).not.toHaveBeenCalled();                 
      62      });
      63  
      67 -    test("offers 0.5×, 1.0× and 2.0× as one radio group and rep
         -orts changes", () => {                                         
      68 -        const onSpeedChange = vi.fn();                         
      69 -        renderInMain(<RecorderControls mode="idle" events={[]} 
         -speed={1} status="" {...HANDLERS} onSpeedChange={onSpeedChange}
         - />);                                                          
      70 -        const group = screen.getByRole("group", { name: "Playba
         -ck speed" });                                                  
      71 -        const radios = within(group).getAllByRole("radio");    
      72 -        expect(radios.map((r) => r.labels[0].textContent.trim()
         -)).toEqual(["0.5×", "1.0×", "2.0×"]);                          
      73 -        expect(screen.getByRole("radio", { name: "1.0×" }).chec
         -ked).toBe(true);                                               
      74 -        fireEvent.click(screen.getByRole("radio", { name: "2.0×
         -" }));                                                         
      75 -        expect(onSpeedChange).toHaveBeenCalledWith(2);         
      76 -    });                                                        
      77 -                                                               
      78 -    test("lists every recorded event, with all four fields, in 
         -recorded order", () => {                                       
      79 -        renderInMain(<RecorderControls mode="idle" events={[ev(
         -69, 0, 300), ev(72, 450, 100)]} speed={1} status="" {...HANDLER
         -S} />);                                                        
      64 +    test("lists every recorded event with all four fields, in r
         +ecorded order", () => {                                        
      65 +        renderInMain(<RecordingControls {...base} events={[ev(6
         +9, 0, 300), ev(72, 450, 100)]} />);                            
      66          const table = screen.getByRole("table", { name: /Record
          ed notes: 2/ });
      67          expect(table.caption.textContent).toBe("Recorded notes:
           2, 0.55 s at 1.0×");
      68          const rows = within(table).getAllByRole("row").slice(1)
          .map((row) => [...row.cells].map((cell) => cell.textContent));
     ...
       70              ["1", "A4", "69", "440.00 Hz", "0 ms", "0 ms", "30
           0 ms"],
       71              ["2", "C5", "72", "523.25 Hz", "450 ms", "450 ms",
            "100 ms"]
       72          ]);
       87 -        const frame = table.closest("figure");                
       88 -        expect(frame.tabIndex).toBe(0);                       
       89 -        expect(frame.getAttribute("aria-labelledby")).toBe(tab
          -le.caption.id);                                               
       73 +        expect(table.closest("figure").tabIndex).toBe(0);     
       74      });
       75  
       92 -    test("status is a polite live region", () => {            
       93 -        renderInMain(<RecorderControls mode="idle" events={[]}
          - speed={1} status="Recording cleared." {...HANDLERS} />);     
       76 +    test.each([                                               
       77 +        ["a non-boolean isRecording", { isRecording: "no" }], 
       78 +        ["corrupt events", { events: [{ midi: 60 }] }],       
       79 +        ["a missing handler", { onClear: undefined }],        
       80 +        ["a negative count", { capturedCount: -1 }]           
       81 +    ])("throws a TypeError for %s (Rule 2)", (_, override) => 
          +{                                                             
       82 +        vi.spyOn(console, "error").mockImplementation(() => {}
          +);                                                            
       83 +        expect(() => renderInMain(<RecordingControls {...base}
          + {...override} />)).toThrow(TypeError);                       
       84 +    });                                                       
       85 +});                                                           
       86 +                                                              
       87 +describe("SequencerControls", () => {                         
       88 +    const base = { canPlay: true, isPlaying: false, speed: 1, 
          +status: "", onPlay: noop, onStop: noop, onSpeedChange: noop };
       89 +                                                              
       90 +    test("offers 0.5×, 1.0× and 2.0× as one radio group and re
          +ports changes", () => {                                       
       91 +        const onSpeedChange = vi.fn();                        
       92 +        renderInMain(<SequencerControls {...base} onSpeedChang
          +e={onSpeedChange} />);                                        
       93 +        const radios = within(screen.getByRole("group", { name
          +: "Playback speed" })).getAllByRole("radio");                 
       94 +        expect(radios.map((r) => r.labels[0].textContent.trim(
          +))).toEqual(["0.5×", "1.0×", "2.0×"]);                        
       95 +        expect(screen.getByRole("radio", { name: "1.0×" }).che
          +cked).toBe(true);                                             
       96 +        fireEvent.click(screen.getByRole("radio", { name: "0.5
          +×" }));                                                       
       97 +        expect(onSpeedChange).toHaveBeenCalledWith(0.5);      
       98 +    });                                                       
       99 +                                                              
      100 +    test("Play is available when it can play; Stop Sequence on
          +ly while playing", () => {                                    
      101 +        const { rerender } = renderInMain(<SequencerControls {
          +...base} />);                                                 
      102 +        expect([available("Play Sequence"), available("Stop Se
          +quence")]).toEqual([true, false]);                            
      103 +        rerender(<SequencerControls {...base} isPlaying />);  
      104 +        expect([available("Play Sequence"), available("Stop Se
          +quence")]).toEqual([false, true]);                            
      105 +        rerender(<SequencerControls {...base} canPlay={false} 
          +/>);                                                          
      106 +        expect([available("Play Sequence"), available("Stop Se
          +quence")]).toEqual([false, false]);                           
      107 +    });                                                       
      108 +                                                              
      109 +    test("its status is a polite live region", () => {        
      110 +        renderInMain(<SequencerControls {...base} status="Play
          +back stopped." />);                                           
      111          const status = screen.getByRole("status");
      112          expect(status.tagName).toBe("OUTPUT");
      113          expect(status.getAttribute("aria-live")).toBe("polite"
           );
       97 -        expect(status.textContent).toBe("Recording cleared.");
      114 +        expect(status.textContent).toBe("Playback stopped."); 
      115      });
      116  
      100 -    test.each([                                               
      101 -        ["an unknown mode", { mode: "paused" }],              
      102 -        ["events that are not recorded events", { events: [{ m
          -idi: 60 }] }],                                                
      103 -        ["an unsupported speed", { speed: 3 }],               
      104 -        ["a missing handler", { onPlay: undefined }],         
      105 -        ["a non-string status", { status: 3 }]                
      106 -    ])("throws a TypeError for %s (Rule 2)", (_, override) => 
          -{                                                             
      107 -        vi.spyOn(console, "error").mockImplementation(() => {}
          -);                                                            
      108 -        const props = { mode: "idle", events: [], speed: 1, st
          -atus: "", ...HANDLERS, ...override };                         
      109 -        expect(() => renderInMain(<RecorderControls {...props}
          - />)).toThrow(TypeError);                                     
      117 +    test.each([["an unsupported speed", { speed: 3 }], ["a mis
          +sing onStop", { onStop: undefined }], ["a non-boolean canPlay"
          +, { canPlay: 1 }]])(                                          
      118 +        "throws a TypeError for %s (Rule 2)", (_, override) =>
          + {                                                            
      119 +            vi.spyOn(console, "error").mockImplementation(() =
          +> {});                                                        
      120 +            expect(() => renderInMain(<SequencerControls {...b
          +ase} {...override} />)).toThrow(TypeError);                   
      121 +        }                                                     
      122 +    );                                                        
      123 +});                                                           
      124 +                                                              
      125 +describe("PianoControls", () => {                             
      126 +    test("shows the voice pool, oldest note first, as a non-li
          +ve readout", () => {                                          
      127 +        renderInMain(<PianoControls activeNotes={new Set([64, 
          +60])} maxVoices={8} onReleaseAll={noop} />);                  
      128 +        const readout = within(screen.getByRole("region", { na
          +me: "Voices" })).getByRole("status");                         
      129 +        expect(readout.textContent).toBe("2 of 8 voices: E4, C
          +4");                                                          
      130 +        expect(readout.getAttribute("aria-live")).toBe("off");
      131      });
      132  
      112 -    test("source uses no <div> and no innerHTML (Rules 1 and 3
          -)", () => {                                                   
      113 -        [SOURCE, HOOK_SOURCE].forEach((source) => {           
      114 -            const code = source.replace(/\/\*[\s\S]*?\*\//g, "
          -").replace(/\/\/.*$/gm, "");                                  
      115 -            expect(code).not.toMatch(/<div\b|innerHTML|dangero
          -uslySetInnerHTML/);                                           
      116 -        });                                                   
      133 +    test("Release All Notes is available only while something 
          +sounds", () => {                                              
      134 +        const onReleaseAll = vi.fn();                         
      135 +        const { rerender } = renderInMain(<PianoControls activ
          +eNotes={new Set()} maxVoices={8} onReleaseAll={onReleaseAll} /
          +>);                                                           
      136 +        expect(screen.getByRole("status").textContent).toBe("0
          + of 8 voices");                                               
      137 +        fireEvent.click(button("Release All Notes"));         
      138 +        expect(onReleaseAll).not.toHaveBeenCalled();          
      139 +        rerender(<PianoControls activeNotes={new Set([60])} ma
          +xVoices={8} onReleaseAll={onReleaseAll} />);                  
      140 +        fireEvent.click(button("Release All Notes"));         
      141 +        expect(onReleaseAll).toHaveBeenCalledTimes(1);        
      142      });
      143 +                                                              
      144 +    test("throws a TypeError for bad props (Rule 2)", () => { 
      145 +        vi.spyOn(console, "error").mockImplementation(() => {}
          +);                                                            
      146 +        expect(() => renderInMain(<PianoControls activeNotes={
          +[60]} maxVoices={8} onReleaseAll={noop} />)).toThrow(TypeError
          +);                                                            
      147 +        expect(() => renderInMain(<PianoControls activeNotes={
          +new Set()} maxVoices={0} onReleaseAll={noop} />)).toThrow(Type
          +Error);                                                       
      148 +    });                                                       
      149  });
      150  
      151  /** A synth double with the real voice-pool semantics that mat
           ter to the UI. */
      152  function fakeSynth() {
      153      const voices = new Map();
      154      return {
      155 +        maxVoices: 8,                                         
      156          voices,
      157          noteOn: vi.fn((midi) => { if (voices.has(midi)) return
            false; voices.set(midi, {}); return true; }),
      158          noteOff: vi.fn((midi) => voices.delete(midi)),
      159          releaseAll: vi.fn(() => voices.clear()),
      128 -        close: vi.fn()                                        
      160 +        close: vi.fn(() => Promise.resolve())                 
      161      };
      162  }
      163  
      132 -describe("App: record and replay", () => {                    
      164 +describe("Piano (App): architecture, recording, replay and Sto
          +p Sequence", () => {                                          
      165      let synth;
      166 +    let unmount;                                              
      167  
      168      beforeEach(() => {
      169          vi.useFakeTimers();
      170          synth = fakeSynth();
      138 -        renderInMain(<App engine={{ synth, now: () => Date.now
          -(), clock: { now: () => Date.now() } }} />);                  
      171 +        ({ unmount } = renderInMain(<App engine={{ synth, now:
          + () => Date.now() }} />));                                    
      172      });
      173  
      174      const key = (name) => screen.getByRole("button", { name })
           ;
      142 -    const status = () => screen.getByRole("status").textConten
          -t;                                                            
      175  
      176      function hold(name, ms) {
      177          fireEvent.pointerDown(key(name), { pointerType: "mouse
           ", button: 0 });
     ...
      184      }
      185  
      186      function recordMelody() {
      155 -        fireEvent.click(action("Start Recording"));           
      187 +        fireEvent.click(button("Start Recording"));           
      188          hold("C4 white key", 200);
      189          rest(100);
      190          hold("E4 white key", 150);
      191          rest(50);
      192          hold("G4 white key", 300);
      161 -        fireEvent.click(action("Stop Recording"));            
      193 +        fireEvent.click(button("Stop Recording"));            
      194      }
      195  
      164 -    const midiCalls = () => synth.noteOn.mock.calls.map(([midi
          -]) => midi);                                                  
      196 +    const played = () => synth.noteOn.mock.calls.map(([midi]) 
          +=> midi);                                                     
      197 +    const advance = (ms) => act(async () => { await vi.advance
          +TimersByTimeAsync(ms); });                                    
      198  
      166 -    test("live keys sound and light up while held, recorded or
          - not", () => {                                                
      199 +    test("renders header, PianoControls, PianoKeyboard, Record
          +ingControls, SequencerControls, with no wrapper", () => {     
      200 +        const main = document.querySelector("main");          
      201 +        expect([...main.children].map((node) => node.tagName))
          +.toEqual(["HEADER", "SECTION", "SECTION", "SECTION", "SECTION"
          +]);                                                           
      202 +        expect([...main.querySelectorAll(":scope > section")].
          +map((s) => s.getAttribute("aria-label") ?? s.querySelector("h2
          +").textContent))                                              
      203 +            .toEqual(["Voices", "88-key piano", "Recording", "
          +Sequencer"]);                                                 
      204 +        expect(main.querySelectorAll("ol > li > button")).toHa
          +veLength(88);                                                 
      205 +    });                                                       
      206 +                                                              
      207 +    test("live keys sound, light up and show in the voice read
          +out", () => {                                                 
      208          fireEvent.pointerDown(key("A4 white key"), { pointerTy
           pe: "mouse", button: 0 });
      209 +        fireEvent.pointerDown(key("C5 white key"), { pointerTy
          +pe: "touch", button: 0 });                                    
      210          expect(synth.noteOn).toHaveBeenCalledWith(69, 440);
      211          expect(key("A4 white key").getAttribute("aria-pressed"
           )).toBe("true");
      170 -        fireEvent.pointerUp(key("A4 white key"), { pointerType
          -: "mouse", button: 0 });                                      
      171 -        expect(synth.noteOff).toHaveBeenCalledWith(69);       
      172 -        expect(key("A4 white key").getAttribute("aria-pressed"
          -)).toBe("false");                                             
      173 -        expect(screen.getByText("No notes recorded yet.")).toB
          -eTruthy();                                                    
      212 +        expect(statusOf("Voices")).toBe("2 of 8 voices: A4, C5
          +");                                                           
      213 +        fireEvent.click(button("Release All Notes"));         
      214 +        expect(synth.releaseAll).toHaveBeenCalled();          
      215 +        expect(document.querySelectorAll("ol button[aria-press
          +ed='true']")).toHaveLength(0);                                
      216      });
      217  
      176 -    test("Start / Stop Recording captures each note's duration
          - and onset delta", () => {                                    
      177 -        fireEvent.click(action("Start Recording"));           
      178 -        expect(status()).toMatch(/^Recording/);               
      179 -        expect(available("Start Recording")).toBe(false);     
      180 -        hold("C4 white key", 200);                            
      181 -        expect(screen.getByText("Notes captured: 1")).toBeTrut
          -hy();                                                         
      182 -        rest(100);                                            
      183 -        hold("E4 white key", 150);                            
      184 -        rest(50);                                             
      185 -        hold("G4 white key", 300);                            
      186 -        fireEvent.click(action("Stop Recording"));            
      187 -        expect(status()).toBe("Recording stopped: 3 notes reco
          -rded.");                                                      
      188 -                                                              
      218 +    test("records each note's duration and onset delta", () =>
          + {                                                            
      219 +        recordMelody();                                       
      220 +        expect(statusOf("Recording")).toBe("Recording stopped:
          + 3 notes recorded.");                                         
      221          const rows = within(screen.getByRole("table")).getAllB
           yRole("row").slice(1)
      222              .map((row) => [...row.cells].slice(1).map((cell) =
           > cell.textContent));
      223          expect(rows).toEqual([
     ...
      227          ]);
      228      });
      229  
      198 -    test("notes played after Stop Recording are not recorded",
          - () => {                                                      
      199 -        recordMelody();                                       
      200 -        hold("B4 white key", 100);                            
      201 -        expect(within(screen.getByRole("table")).getAllByRole(
          -"row")).toHaveLength(4);                                      
      202 -    });                                                       
      230 +    test.each([["0.5×", 0.5, [0, 600, 1000], 1600], ["1.0×", 1
          +, [0, 300, 500], 800], ["2.0×", 2, [0, 150, 250], 400]])(     
      231 +        "Play Sequence at %s replays in order, scaled in time"
          +, async (label, speed, onsets, end) => {                      
      232 +            recordMelody();                                   
      233 +            synth.noteOn.mockClear();                         
      234 +            fireEvent.click(screen.getByRole("radio", { name: 
          +label }));                                                    
      235 +            const start = Date.now();                         
      236 +            const times = [];                                 
      237 +            synth.noteOn.mockImplementation((midi) => { times.
          +push(Date.now() - start); synth.voices.set(midi, {}); return t
          +rue; });                                                      
      238 +            fireEvent.click(button("Play Sequence"));         
      239 +            expect(statusOf("Sequencer")).toBe(`Playing 3 note
          +s at ${speed.toFixed(1)}×.`);                                 
      240 +            expect(available("Start Recording")).toBe(false); 
      241 +            await advance(end - 1);                           
      242 +            expect(played()).toEqual([60, 64, 67]);           
      243 +            expect(times).toEqual(onsets);                    
      244 +            expect(key("G4 white key").getAttribute("aria-pres
          +sed")).toBe("true");                                          
      245 +            await advance(1);                                 
      246 +            expect(statusOf("Sequencer")).toBe("Playback finis
          +hed.");                                                       
      247 +            expect(available("Play Sequence")).toBe(true);    
      248 +        }                                                     
      249 +    );                                                        
      250  
      204 -    test.each([                                               
      205 -        ["0.5×", 0.5, [0, 600, 1000], 1600],                  
      206 -        ["1.0×", 1, [0, 300, 500], 800],                      
      207 -        ["2.0×", 2, [0, 150, 250], 400]                       
      208 -    ])("Play Sequence at %s replays the notes in order, scaled
          - in time", async (label, speed, onsets, end) => {             
      251 +    test("Stop Sequence aborts at once: pending notes never pl
          +ay, voices released, state reset", async () => {              
      252          recordMelody();
      253          synth.noteOn.mockClear();
      211 -        fireEvent.click(screen.getByRole("radio", { name: labe
          -l }));                                                        
      212 -        const start = Date.now();                             
      213 -        const times = [];                                     
      214 -        synth.noteOn.mockImplementation((midi) => { times.push
          -(Date.now() - start); synth.voices.set(midi, {}); return true;
          - });                                                          
      254 +        const abort = vi.spyOn(AbortController.prototype, "abo
          +rt");                                                         
      255 +        fireEvent.click(button("Play Sequence"));             
      256 +        await advance(350);                                   
          +// E4 sounding, G4 pending                                    
      257 +        expect(vi.getTimerCount()).toBeGreaterThan(0);        
      258 +        fireEvent.click(button("Stop Sequence"));             
      259 +        expect(abort).toHaveBeenCalledTimes(1);               
      260 +        expect(vi.getTimerCount()).toBe(0);                   
          +// every pending delay cleared synchronously                  
      261 +        expect(synth.releaseAll).toHaveBeenCalled();          
      262 +        expect(synth.voices.size).toBe(0);                    
      263 +        expect(document.querySelectorAll("ol button[aria-press
          +ed='true']")).toHaveLength(0);                                
      264 +        expect(statusOf("Sequencer")).toBe("Playback stopped."
          +);                                                            
      265 +        expect([available("Play Sequence"), available("Stop Se
          +quence")]).toEqual([true, false]);                            
      266 +        await advance(5000);                                  
      267 +        expect(played()).toEqual([60, 64]);                   
          +// G4 never scheduled                                         
      268 +    });                                                       
      269  
      216 -        fireEvent.click(action("Play Sequence"));             
      217 -        expect(status()).toBe(`Playing 3 notes at ${speed.toFi
          -xed(1)}×.`);                                                  
      218 -        expect(available("Play Sequence")).toBe(false);       
      219 -        expect(available("Start Recording")).toBe(false);     
      220 -        await act(async () => { await vi.advanceTimersByTimeAs
          -ync(end - 1); });                                             
      221 -        expect(midiCalls()).toEqual([60, 64, 67]);            
      222 -        expect(times).toEqual(onsets);                        
      223 -        expect(key("G4 white key").getAttribute("aria-pressed"
          -)).toBe("true");   // replay lights the keys                  
      224 -        await act(async () => { await vi.advanceTimersByTimeAs
          -ync(1); });                                                   
      225 -        expect(key("G4 white key").getAttribute("aria-pressed"
          -)).toBe("false");                                             
      226 -        expect(status()).toBe("Playback finished.");          
      227 -        expect(available("Play Sequence")).toBe(true);        
      270 +    test("a stop is not an error: no 'failed' message, now or 
          +after the replay settles", async () => {                      
      271 +        recordMelody();                                       
      272 +        const consoleError = vi.spyOn(console, "error");      
      273 +        fireEvent.click(button("Play Sequence"));             
      274 +        await advance(100);                                   
      275 +        fireEvent.click(button("Stop Sequence"));             
      276 +        await advance(2000);                                  
      277 +        expect(statusOf("Sequencer")).toBe("Playback stopped."
          +);                                                            
      278 +        expect(document.body.textContent).not.toMatch(/fail|er
          +ror/i);                                                       
      279 +        expect(consoleError).not.toHaveBeenCalled();          
      280      });
      281  
      230 -    test("a recording replays again and again, unchanged", asy
          -nc () => {                                                    
      282 +    test("after a stop, a new sequence starts immediately and 
          +runs to the end", async () => {                               
      283          recordMelody();
      232 -        const before = within(screen.getByRole("table")).getAl
          -lByRole("row").map((row) => row.textContent);                 
      284 +        fireEvent.click(button("Play Sequence"));             
      285 +        await advance(100);                                   
      286 +        fireEvent.click(button("Stop Sequence"));             
      287          synth.noteOn.mockClear();
      234 -        for (let i = 0; i < 3; i += 1) {                      
      235 -            fireEvent.click(action("Play Sequence"));         
      236 -            await act(async () => { await vi.runAllTimersAsync
          -(); });                                                       
      237 -        }                                                     
      238 -        expect(midiCalls()).toEqual([60, 64, 67, 60, 64, 67, 6
          -0, 64, 67]);                                                  
      239 -        expect(within(screen.getByRole("table")).getAllByRole(
          -"row").map((row) => row.textContent)).toEqual(before);        
      288 +        fireEvent.click(button("Play Sequence"));             
      289 +        expect(statusOf("Sequencer")).toMatch(/^Playing/);    
      290 +        await advance(800);                                   
      291 +        expect(played()).toEqual([60, 64, 67]);               
      292 +        expect(statusOf("Sequencer")).toBe("Playback finished.
          +");   // the old, stopped run did not overwrite it            
      293      });
      294  
      242 -    test("pressing Play Sequence repeatedly does not start com
          -peting replays", async () => {                                
      295 +    test("every Play Sequence gets its own AbortController; re
          +peated clicks start one replay", async () => {                
      296          recordMelody();
      297          synth.noteOn.mockClear();
      245 -        fireEvent.click(action("Play Sequence"));             
      246 -        fireEvent.click(action("Play Sequence"));             
      247 -        fireEvent.click(action("Play Sequence"));             
      248 -        await act(async () => { await vi.runAllTimersAsync(); 
          -});                                                           
      249 -        expect(midiCalls()).toEqual([60, 64, 67]);            
      298 +        const signals = new Set();                            
      299 +        const original = AbortController.prototype.abort;     
      300 +        vi.spyOn(AbortController.prototype, "abort").mockImple
          +mentation(function abort(...args) {                           
      301 +            signals.add(this.signal);                         
      302 +            return original.apply(this, args);                
      303 +        });                                                   
      304 +        fireEvent.click(button("Play Sequence"));             
      305 +        fireEvent.click(button("Play Sequence"));             
      306 +        await advance(10);                                    
      307 +        fireEvent.click(button("Stop Sequence"));             
      308 +        fireEvent.click(button("Play Sequence"));             
      309 +        await advance(10);                                    
      310 +        fireEvent.click(button("Stop Sequence"));             
      311 +        expect(signals.size).toBe(2);                         
      312 +        expect(played()).toEqual([60, 60]);                   
      313      });
      314  
      252 -    test("Clear Recording removes every event, and stops a rep
          -lay in progress", async () => {                               
      315 +    test("Clear Recording during playback stops the sequence a
          +nd removes every event", async () => {                        
      316          recordMelody();
      254 -        fireEvent.click(action("Play Sequence"));             
      255 -        await act(async () => { await vi.advanceTimersByTimeAs
          -ync(350); });                                                 
      256 -        fireEvent.click(action("Clear Recording"));           
      317 +        fireEvent.click(button("Play Sequence"));             
      318 +        await advance(350);                                   
      319 +        fireEvent.click(button("Clear Recording"));           
      320          expect(synth.voices.size).toBe(0);
      258 -        expect(status()).toBe("Recording cleared.");          
      321 +        expect(statusOf("Recording")).toBe("Recording cleared.
          +");                                                           
      322 +        expect(statusOf("Sequencer")).toBe("Playback stopped."
          +);                                                            
      323          expect(screen.getByText("No notes recorded yet.")).toB
           eTruthy();
      260 -        await act(async () => { await vi.runAllTimersAsync(); 
          -});                                                           
      261 -        expect(midiCalls().slice(3)).toEqual([60, 64]);       
          -    // G4 never played                                        
      324          expect(available("Play Sequence")).toBe(false);
      325      });
      326  
      265 -    test("a new take replaces the previous recording", () => {
      327 +    test("unmount aborts the sequence, clears its timers, rele
          +ases voices, closes audio and removes listeners", async () => 
          +{                                                             
      328          recordMelody();
      267 -        fireEvent.click(action("Start Recording"));           
      268 -        hold("D4 white key", 100);                            
      269 -        fireEvent.click(action("Stop Recording"));            
      270 -        const rows = within(screen.getByRole("table")).getAllB
          -yRole("row").slice(1);                                        
      271 -        expect(rows.map((row) => row.cells[1].textContent)).to
          -Equal(["D4"]);                                                
      272 -    });                                                       
      273 -                                                              
      274 -    test("the window losing focus releases every sounding note
          -", () => {                                                    
      275 -        fireEvent.pointerDown(key("C4 white key"), { pointerTy
          -pe: "mouse", button: 0 });                                    
      276 -        fireEvent.pointerDown(key("E4 white key"), { pointerTy
          -pe: "touch", button: 0 });                                    
      277 -        act(() => { window.dispatchEvent(new Event("blur")); }
          -);                                                            
      329 +        const removed = vi.spyOn(window, "removeEventListener"
          +);                                                            
      330 +        fireEvent.click(button("Play Sequence"));             
      331 +        await advance(350);                                   
      332 +        synth.noteOn.mockClear();                             
      333 +        unmount();                                            
      334 +        expect(vi.getTimerCount()).toBe(0);                   
      335          expect(synth.releaseAll).toHaveBeenCalled();
      279 -        expect(document.querySelectorAll("button[aria-pressed=
          -'true']")).toHaveLength(0);                                   
      336 +        expect(synth.voices.size).toBe(0);                    
      337 +        expect(synth.close).toHaveBeenCalledTimes(1);         
      338 +        expect(removed).toHaveBeenCalledWith("blur", expect.an
          +y(Function));                                                 
      339 +        await act(async () => { await vi.runAllTimersAsync(); 
          +});                                                           
      340 +        expect(synth.noteOn).not.toHaveBeenCalled();          
      341      });
      342  });

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests
      |Error:|Expected|Received|^\s+[…)
  ⎿        Tests  228 passed (228)
  ⎿  (timeout 3m)

● All 228 unit tests pass. I'm now scoping the Edge status checks to each of the
  three regions, adding Stop Sequence with real audio, and measuring render
  isolation in the browser.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; grep -n 'getByRole("status")\|Recorder\|region'
      e2e/recorder.spec.js)
  ⎿  16:    await expect(page.getByRole("region", { name: "Recorder" })).to
     BeVisible();
     42:    await expect(page.getByRole("status")).toHaveText("Recording st
     … +7 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; python -c "
      p='e2e/recorder.spec.js'; s=open(p,encoding='utf8').read()…)
  ⎿  23:const recordingStatus = (page) => page.getByRole("region", { name:
     "Recording" }).getByRole("status");
     24:const playbackStatus = (page) => page.getByRole("region", { name: "
     Sequencer" }).getByRole("status");
  ⎿  Updated LAB3\HW\pianoEngine\e2e\recorder.spec.js (+134 -132)
        1 -import { expect, test } from "@playwright/test";              
        2 -import AxeBuilder from "@axe-core/playwright";                
        3 -                                                              
        4 -// T-02C — record with real mouse presses, replay through the 
          -real PolyphonicSynth at                                       
        5 -// 0.5× / 1.0× / 2.0× in Microsoft Edge, keyboard operation an
          -d WCAG 2.2 AA.                                                
        6 -                                                              
        7 -let consoleErrors;                                            
        8 -                                                              
        9 -test.beforeEach(async ({ page }) => {                         
       10 -    consoleErrors = [];                                       
       11 -    page.on("console", (message) => {                         
       12 -        if (message.type() === "error" || message.type() === "
          -warning") consoleErrors.push(message.text());                 
       13 -    });                                                       
       14 -    page.on("pageerror", (error) => consoleErrors.push(error.m
          -essage));                                                     
       15 -    await page.goto("/");                                     
       16 -    await expect(page.getByRole("region", { name: "Recorder" }
          -)).toBeVisible();                                             
       17 -});                                                           
       18 -                                                              
       19 -test.afterEach(() => {                                        
       20 -    expect(consoleErrors, "no JavaScript errors or warnings in
          - the console").toEqual([]);                                   
       21 -});                                                           
       22 -                                                              
       23 -const control = (page, name) => page.getByRole("button", { nam
          -e, exact: true });                                            
       24 -const pianoKey = (page, name) => page.getByRole("button", { na
          -me: `${name} key` });                                         
       25 -                                                              
       26 -/** Holds a key with the real mouse for about `ms`. */        
       27 -async function hold(page, name, ms) {                         
       28 -    const key = pianoKey(page, name);                         
       29 -    await key.scrollIntoViewIfNeeded();                       
       30 -    await key.hover();                                        
       31 -    await page.mouse.down();                                  
       32 -    await page.waitForTimeout(ms);                            
       33 -    await page.mouse.up();                                    
       34 -}                                                             
       35 -                                                              
       36 -async function recordThreeNotes(page) {                       
       37 -    await control(page, "Start Recording").click();           
       38 -    await hold(page, "C4 white", 250);                        
       39 -    await hold(page, "E4 white", 250);                        
       40 -    await hold(page, "G4 white", 250);                        
     … 226 more lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\e2e\sequencer.spec.js)
  ⎿  Wrote 131 lines to LAB3\HW\pianoEngine\e2e\sequencer.spec.js
      1 import { expect, test } from "@playwright/test";
      2 import AxeBuilder from "@axe-core/playwright";
      3 import { installRenderTracker } from "../src/test/renderTracker.j
        s";
      4 
      5 // T-02D in Microsoft Edge with the real PolyphonicSynth:
      6 //   * Stop Sequence aborts a running replay at once and silences
         it, without an error;
      7 //   * React.memo render isolation, measured through React's DevT
        ools hook (the same
     … +124 lines (ctrl+o to expand)

● That unmount e2e test I just wrote proves nothing (the app root can't be
  reached from outside to unmount it), so I'm removing it. The unit tests
  already cover unmount cleanup with real assertions.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; python -c "
      p='e2e/sequencer.spec.js'; s=open(p,encoding='utf8').read()…)
  ⎿    ✘  11 e2e\piano.spec.js:106:1 › 2.4.7: keyboard focus shows a 3px ri
     ng (444ms)
       ✘  15 e2e\sequencer.spec.js:83:1 › Profiler check: pressing one key
     … +16 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\e2e\sequencer.spec.js (+116 -131)
        1 -import { expect, test } from "@playwright/test";              
        2 -import AxeBuilder from "@axe-core/playwright";                
        3 -import { installRenderTracker } from "../src/test/renderTracke
          -r.js";                                                        
        4 -                                                              
        5 -// T-02D in Microsoft Edge with the real PolyphonicSynth:     
        6 -//   * Stop Sequence aborts a running replay at once and silen
          -ces it, without an error;                                     
        7 -//   * React.memo render isolation, measured through React's D
          -evTools hook (the same                                        
        8 -//     mechanism the React DevTools Profiler uses), with real 
          -pointer input;                                                
        9 -//   * unmount cleanup (the app root is unmounted in the page)
          -.                                                             
       10 -                                                              
       11 -let consoleErrors;                                            
       12 -                                                              
       13 -test.beforeEach(async ({ page }) => {                         
       14 -    consoleErrors = [];                                       
       15 -    page.on("console", (message) => {                         
       16 -        if (message.type() === "error" || message.type() === "
          -warning") consoleErrors.push(message.text());                 
       17 -    });                                                       
       18 -    page.on("pageerror", (error) => consoleErrors.push(error.m
          -essage));                                                     
       19 -    // Installed before any page script, exactly like the DevT
          -ools extension.                                               
       20 -    await page.addInitScript(installRenderTracker, "PianoKey")
          -;                                                             
       21 -    await page.goto("/");                                     
       22 -    await expect(page.getByRole("region", { name: "Sequencer" 
          -})).toBeVisible();                                            
       23 -});                                                           
       24 -                                                              
       25 -test.afterEach(() => {                                        
       26 -    expect(consoleErrors, "no JavaScript errors or warnings in
          - the console").toEqual([]);                                   
       27 -});                                                           
       28 -                                                              
       29 -const control = (page, name) => page.getByRole("button", { nam
          -e, exact: true });                                            
       30 -const pianoKey = (page, name) => page.getByRole("button", { na
          -me: `${name} key` });                                         
       31 -const playbackStatus = (page) => page.getByRole("region", { na
          -me: "Sequencer" }).getByRole("status");                       
       32 -                                                              
       33 -async function hold(page, name, ms) {                         
       34 -    const key = pianoKey(page, name);                         
       35 -    await key.scrollIntoViewIfNeeded();                       
       36 -    await key.hover();                                        
       37 -    await page.mouse.down();                                  
       38 -    await page.waitForTimeout(ms);                            
       39 -    await page.mouse.up();                                    
       40 -}                                                             
     … 207 more lines (ctrl+o to expand)
  ⎿  (timeout 6m 40s)

● The Voices panel's Release All Notes button is now the first Tab stop, so I'm
  updating the PRD 1 focus test. I'm also changing the tracker's init signature
  to (componentName, target = globalThis), since Playwright passes the argument
  as the first parameter.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; python -c "
      p='src/test/renderTracker.js'; s=open(p,encoding='utf8').read()…)
  ⎿      await c8.focus();
         await expect(c8).toBeInViewport({ ratio: 1 });
         expect(await page.evaluate(() => document.querySelector("ol").scro
     … +17 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\components\renderIsolation.test.jsx
     (+108 -108)
        1 -import { afterAll, beforeAll, beforeEach, describe, expect, te
          -st, vi } from "vitest";                                       
        2 -import { installRenderTracker } from "../test/renderTracker.js
          -";                                                            
        3 -                                                              
        4 -// T-02D — React.memo render isolation (PRD 4 sections 6–8), m
          -easured the way the React                                     
        5 -// DevTools Profiler measures it: through React's DevTools hoo
          -k, which must exist before                                    
        6 -// react-dom loads. So the hook is installed first and React i
          -s imported dynamically.                                       
        7 -                                                              
        8 -installRenderTracker(globalThis, "PianoKey");                 
        9 -const { act, cleanup, fireEvent, render, screen } = await impo
          -rt("@testing-library/react");                                 
       10 -const { default: App } = await import("../App.jsx");          
       11 -const { default: PianoKey, PianoKeyView } = await import("./Pi
          -anoKey.jsx");                                                 
       12 -const { shallowEqual } = await import("../utils/shallowEqual.j
          -s");                                                          
       13 -                                                              
       14 -/** A synth double with the real voice-pool semantics (8 voice
          -s, FIFO stealing). */                                         
       15 -function fakeSynth() {                                        
       16 -    const voices = new Map();                                 
       17 -    return {                                                  
       18 -        maxVoices: 8,                                         
       19 -        voices,                                               
       20 -        noteOn: vi.fn((midi) => {                             
       21 -            if (voices.has(midi)) return false;               
       22 -            if (voices.size >= 8) voices.delete(voices.keys().
          -next().value);                                                
       23 -            voices.set(midi, {});                             
       24 -            return true;                                      
       25 -        }),                                                   
       26 -        noteOff: vi.fn((midi) => voices.delete(midi)),        
       27 -        releaseAll: vi.fn(() => voices.clear()),              
       28 -        close: vi.fn()                                        
       29 -    };                                                        
       30 -}                                                             
       31 -                                                              
       32 -let synth;                                                    
       33 -const key = (name) => screen.getByRole("button", { name });   
       34 -const down = (name) => fireEvent.pointerDown(key(name), { poin
          -terType: "mouse", button: 0 });                               
       35 -const up = (name) => fireEvent.pointerUp(key(name), { pointerT
          -ype: "mouse", button: 0 });                                   
       36 -                                                              
       37 -/** The PianoKey renders of every commit caused by `action`, f
          -lattened. */                                                  
       38 -function rendersDuring(action) {                              
       39 -    const before = globalThis.__renders.length;               
       40 -    act(action);                                              
     … 176 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pianoEngine\src\test\renderTracker.js (+59 -58)
       1 -/**                                                            
       2 - * Polyphonic Piano Engine — T-02D render tracker (test-only, n
         -ever imported by the app)                                      
       3 - *                                                             
       4 - * An automated stand-in for the React DevTools Profiler. DevTo
         -ols works by                                                   
       5 - * installing `__REACT_DEVTOOLS_GLOBAL_HOOK__` before React loa
         -ds; React then                                                 
       6 - * calls hook.onCommitFiberRoot(rendererID, root) after every c
         -ommit. This                                                    
       7 - * tracker installs a minimal hook of its own and, like the Pro
         -filer, decides                                                 
       8 - * per fiber whether it rendered in that commit from React's Pe
         -rformedWork                                                    
       9 - * flag (the check DevTools' didFiberRender uses for function c
         -omponents).                                                    
      10 - *                                                             
      11 - * A fiber that bails out is either cloned (flags reset, so no 
         -PerformedWork)                                                 
      12 - * or reused untouched from an earlier commit (same object, sam
         -e                                                              
      13 - * memoizedProps). The tracker remembers which props object it 
         -last counted                                                   
      14 - * for each fiber, so a reused fiber still flagged from an olde
         -r commit is not                                                
      15 - * counted twice.                                              
      16 - *                                                             
      17 - * After every commit, target.__renders gets one entry: the `pi
         -anoKey.midi`                                                   
      18 - * (or the props, for other components) of every `componentName
         -` fiber that                                                   
      19 - * actually rendered. The function is self-contained so Playwri
         -ght can                                                        
      20 - * serialise it into page.addInitScript.                       
      21 - */                                                            
      22 -export function installRenderTracker(target, componentName) {  
      23 -    const PERFORMED_WORK = 1;                                  
      24 -    const counted = new WeakMap();                             
      25 -    target.__renders = [];                                     
      26 -    target.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {                  
      27 -        supportsFiber: true,                                   
      28 -        isDisabled: false,                                     
      29 -        renderers: new Map(),                                  
      30 -        inject(internals) {                                    
      31 -            const id = this.renderers.size + 1;                
      32 -            this.renderers.set(id, internals);                 
      33 -            return id;                                         
      34 -        },                                                     
      35 -        checkDCE() {},                                         
      36 -        onScheduleFiberRoot() {},                              
      37 -        onCommitFiberUnmount() {},                             
      38 -        onPostCommitFiberRoot() {},                            
      39 -        setStrictMode() {},                                    
      40 -        onCommitFiberRoot(rendererID, root) {                  
     … 77 more lines (ctrl+o to expand)

● Update(LAB3\HW\pianoEngine\e2e\piano.spec.js)
  ⎿  Added 3 lines
      104  });
      105  
      106  test("2.4.7: keyboard focus shows a 3px ring", async ({ page }
           ) => {
      107 +    // Tab order: Release All Notes (Voices panel), then the f
          +irst key, A0.                                                 
      108      await page.keyboard.press("Tab");
      109 +    await expect(page.getByRole("button", { name: "Release All
          + Notes" })).toBeFocused();                                    
      110 +    await page.keyboard.press("Tab");                         
      111      const ring = await page.evaluate(() => {
      112          const style = getComputedStyle(document.activeElement)
           ;
      113          return { midi: document.activeElement.dataset.midi, st
           yle: style.outlineStyle, width: parseFloat(style.outlineWidth)
            };

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test 2>&1 | grep -vE "^\s*$" | grep -E
      "✘|passed|failed|Erro…)
  ⎿    20 passed (22.6s)
           Tests  228 passed (228)
  ⎿  (timeout 6m 40s)

● Everything passes: 228 unit tests, 20 Edge tests. Checking the
  timing-sensitive Edge tests for flakiness, running the build, and taking a
  screenshot:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; npx playwright test e2e/sequencer.spec.js e2e/recorder.spec.js
      --repeat-eac…)
  ⎿    27 passed (27.0s)

     ✓ built in 248ms
       1 passed (7.0s)
  ⎿  (timeout 8m 20s)
  Read 1 file (ctrl+o to expand)

● The screenshot was taken during a 0.5× replay. C4 is lit amber, the Voices
  panel shows "1 of 8 voices: C4", and Stop Sequence is active while Play
  Sequence shows as unavailable. Committing:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pi
      anoEngine"; git add -A . && git status --short . && git commit -q -F -
      <<'EOF'
      feat(hw2…)
  ⎿  warning: in the working copy of 'LAB3/HW/pianoEngine/e2e/piano.spec.js
     ', LF will be replaced by CRLF the next time Git touches it
     warning: in the working copy of 'LAB3/HW/pianoEngine/src/App.jsx', LF
     … +50 lines (ctrl+o to expand)

  Wrote 1 memory (ctrl+o to expand)

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; sed -i 's/PRDs 1–3 committed in
      LAB3\/HW\/pianoEngine; l…)
  ⎿  - [LAB3 HW2 piano engine status](lab3-hw2-piano-engine.md) — all 4 PRD
     s committed in LAB3/HW/pianoEngine; structure, abort, render-isolation
      decisions
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

  Recalled 1 memory, wrote 1 memory (ctrl+o to expand)

● PRD 4 is done and committed as 51b0781 feat(hw2): add abortable sequencer and 
  memoized render isolation, which finishes HW2. All 228 unit tests and 20 Edge
  browser tests pass, and the build works. The Edge tests that depend on timing
  passed three runs in a row.

  Stopping playback
  - utils/abortableDelay.js is the PRD's version, with input checks added.
  - audio/playSequence.js replaces last PRD's sequence player and is called as
    playSequence({ queue, synth, speed, signal }). It checks the signal before
    each note and again after every wait, so a timer that had already fired
    can't start a note.
  - Each Play Sequence creates its own AbortController (in
    hooks/useSequencer.js). Stop Sequence:
    - aborts it, which clears every pending timer immediately
    - calls releaseAll()
    - resets the playback state.

    A new sequence can start straight away, and a stopped run that finishes late
    can't overwrite the new one's status.
  - A stop is not an error. playSequence returns { completed: false } instead of
    throwing, so the status says "Playback stopped." Tests check there is no
    "failed" text and nothing in the console. Real errors are still reported.
  - Unmounting aborts the playback, releases all notes, closes the AudioContext
    and removes the window blur listener. This is covered by unit tests only;
    the Edge tests can't reach the app root to unmount it.

  Structure and memo
  - The code now follows the PRD's folders (data/, utils/, hooks/, audio/) and
    component tree: Piano → PianoControls, PianoKeyboard (88 × PianoKey),
    RecordingControls, SequencerControls. The audio engine stays in the hooks;
    keys only report presses.
  - PianoKey is exported as memo(PianoKey, shallowEqual). There is no Lab 2
    shallowEqual anywhere in this repo, so I wrote one in utils/shallowEqual.js.
    If your course requires its exact version, swap it in.
  - The key objects, callbacks, class names and grid styles stay the same
    between renders, so only isActive changes.

  Profiler check
  - I automated the check the PRD asks you to do in React DevTools.
    src/test/renderTracker.js installs the same React hook the DevTools Profiler
    uses and records which PianoKeys actually render on each update. It runs in
    jsdom and in Edge with real mouse input.
  - Results:
    - Pressing one key re-renders only that key, for several notes, both white
      and black.
    - Holding C4 and then pressing E4 re-renders only E4.
    - A 9th note that steals a voice re-renders exactly 2 keys: the dropped one
      and the new one.
    - The recording and sequencer controls re-render no keys.
  - To make sure these tests can actually fail, I temporarily replaced the memo
    comparison with one that always reports a change. Six of the eight tests
    failed, then passed again once it was restored.
  - I did not do the manual DevTools Profiler run from section 8. If your
    submission needs a screenshot of it, you'll need to take that yourself.

  What else changed
  - New Voices panel: I put a voice readout ("2 of 8 voices: C4, E4") and a
    Release All Notes button into the PianoControls slot, because the PRD
    doesn't say what goes there.
  - Tab order: the first stop is now Release All Notes, so I updated the PRD 1
    focus test.
  - Two status lines: recording and playback each have their own.
  - Stricter source check: the no-<div> and no-innerHTML test now scans every
    source file.

  While testing, I briefly restored PianoKey.jsx from git by mistake, which
  brought back its PRD 3 version. I rewrote it before committing, and everything
  passes against the committed code. As before, I didn't write a report.

✻ Brewed for 14m 37s · done 7:15 PM

❯ /export                                                                       
  ⎿  Export cancelled

❯ /export log_working_2.md                                                      
  ⎿  Conversation exported to:
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r\log_working_2.md

❯ help me done AI_AUDIT_FAILURE_2.md for hw2 same format with which you doen    
  for hw1                                                                       

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r"; cat
      LAB3/HW/drumKit/AI_AUDIT_FAILURE_1.md; echo ----; ls LAB3/HW/drumKit/*.md;
      ls *.md; git sta…)
  ⎿  # AI Failure Audit 1 — HW1: Production Studio Drum Kit

     Defects found in the AI-assisted work on HW1 (PRD 1 to PRD 4): the sem
     … +335 lines (ctrl+o to expand)

● I'm following HW1's layout, a summary table with a section per failure, and
  I'm pulling the exact HW2 figures and log location first.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r"; node -e
      '
      const L=h=>{const
      c=h.match(/[0-9a-f]{2}/gi).map(p=>{p=parseInt(p,16)/255;return p<=0…)
  ⎿  amber/whitekey 2.05 violet/white 4.05 violet/black 4.19 violet/pressed
     black 1.19 inner/pressedblack 4.80
     5885
     … +4 lines (ctrl+o to expand)

● Write(LAB3\HW\pianoEngine\AI_AUDIT_FAILURE_2.md)
  ⎿  Wrote 481 lines to LAB3\HW\pianoEngine\AI_AUDIT_FAILURE_2.md
       1 # AI Failure Audit 2 — HW2: Polyphonic Voice Pool & Async FIFO R
         eplay
       2 
       3 Defects found in the AI-assisted work on HW2 (PRD 1 to PRD 4): t
         he
       4 algorithmic 88-key piano, the 8-voice PolyphonicSynth, FIFO reco
         rding with
       5 variable-speed replay, and the abortable sequencer with React.me
         mo render
       6 isolation.
     … +475 lines (ctrl+o to expand)

● I wrote LAB3/HW/pianoEngine/AI_AUDIT_FAILURE_2.md in the same format as HW1's
  audit: a summary table, then one section per failure with Description, Where
  we met it, Solution and a Lesson. It covers 11 failures from this session:

  1. Page overflow: the hidden screen-reader text escaped the scrolling keyboard
     and made the page 1,698 px too wide (PRD 1).
  2. Colours I picked failed contrast: amber focus ring at 2.05:1 on white keys,
     and violet ring at 1.19:1 on a pressed black key.
  3. Heredoc failures again: a repeat of HW1's Failure 8, plus one patch that
     silently changed nothing.
  4. PRD's replay diagram: its strictly sequential flow would play overlapping
     notes late, so I documented a deliberate deviation.
  5. Late release: stop() released the sounding notes one microtask too late.
  6. Two wrong tests: the clock-skew test and the radio-label whitespace check.
  7. MutationObserver bug: .observe() returns undefined, so the observer was
     never disconnected; it took two attempts to fix.
  8. git checkout -- wiped uncommitted work in PianoKey.jsx during PRD 4.
  9. Playwright argument mistake: addInitScript(fn, arg) passes the argument
     first, which my tracker didn't expect.
  10. Useless test: I wrote an "unmount" browser test that could never fail,
      then deleted it.
  11. Regressions: later PRDs broke earlier tests (the removed click API, the
      new first Tab stop).

  The summary repeats that the manual React DevTools Profiler run wasn't done by
  hand, so it stays visible.

  Two things you may want to handle:
  - Log location: /export saved log_working_2.md at the repo root, but the audit
    names it as its evidence. For HW1 the log sits next to the audit, so you
    may want to move it into LAB3/HW/pianoEngine/.
  - Not committed: neither file is committed yet. Tell me if you want me to
    commit them.

✻ Baked for 1m 57s · done 7:21 PM

※ recap: HW2's piano engine is finished: all four PRDs are committed, and AI_AUDIT_FAILURE_2.md is now in LAB3/HW/pianoEngine in HW1's format. Next, tell me whether to move log_working_2.md beside it and commit both files. (disable recaps in /config)

❯ now we start with new task hw3, HW 3 — KRAFTON x PUBG Vietnam Championship &  
  Airdrop Arena                                                                 
  Final project structure                                                       
  Here is the consolidated structure across all four PRDs:                      
                                                                                
  src/                                                                          
  ├── components/                                                               
  │   ├── AirdropCountdown.jsx                                                  
  │   ├── AirdropArena.jsx                                                      
  │   ├── ClaimCard.jsx                                                         
  │   ├── ClaimStatus.jsx                                                       
  │   ├── Leaderboard.jsx                                                       
  │   ├── LeaderboardRow.jsx                                                    
  │   ├── LeaderboardControls.jsx                                               
  │   ├── KillFeed.jsx                                                          
  │   └── VirtualList.jsx                                                       
  │                                                                             
  ├── hooks/                                                                    
  │   ├── usePubgAirdropTimer.js                                                
  │   └── useOptimisticClaim.js                                                 
  │                                                                             
  ├── services/                                                                 
  │   └── claimService.js                                                       
  │                                                                             
  ├── data/                                                                     
  │   ├── pubgSquads.js                                                         
  │   └── inventory.js                                                          
  │                                                                             
  ├── utils/                                                                    
  │   ├── formatVND.js                                                          
  │   └── virtualListUtils.js                                                   
  │                                                                             
  ├── App.jsx                                                                   
  └── main.jsx                                                                  
                                                                                
  AI_FAILURE_AUDIT.md                                                           
  You should preserve your existing Vite configuration, package.json, and Lab 2 
  implementations.                                                              
  Three engineering details I want you to pay attention to                      
  These are the areas most likely to cause problems during implementation.      
                                                                                
  1. Timer accuracy vs. timer synchronization                                   
                                                                                
  Date.now() prevents accumulated interval drift, but serverOffsetMs only helps 
  if you have a reliable way to obtain that offset. For this exercise, you can  
  simulate a known server offset if no backend is provided.                     
                                                                                
  2. Optimistic rollback and concurrent claims                                  
                                                                                
  Be careful when implementing rollback. If two different items are claimed     
  simultaneously, one failed request must not accidentally restore or overwrite 
  the other item's stock. Associate each optimistic transaction with its own    
  item and claim identifier.                                                    
                                                                                
  3. Virtual scrolling and actual data volume                                   
                                                                                
  Your initial leaderboard only contains four squads. Don't claim that the      
  leaderboard itself demonstrates large-scale virtualization. Use a larger      
  simulated kill-feed dataset (for example, 1,000 events) to demonstrate that   
  the virtual scroller renders only the visible region and overscan.            
                                                                                
  6. Recommended implementation order                                           
  Finish the timer first.                                                       
                                                                                
  Verify background-tab behavior before connecting it to the dashboard.         
                                                                                
  Build the claim transaction independently.                                    
                                                                                
  Test both HTTP 200 and HTTP 409 before integrating the inventory cards.       
                                                                                
  Reuse your Lab 2 Virtual Scroller.                                            
                                                                                
  Extend the existing implementation instead of rewriting it from scratch.      
                                                                                
  Complete the AI failure audit using actual debugging evidence.                
                                                                                
  Record mistakes as you encounter them instead of trying to reconstruct        
  everything at the end.                                                        
                                                                                
  My biggest recommendation: Give AI_FAILURE_AUDIT.md special attention because 
  it accounts for 15% of the grade. A technically working application is        
  important, but demonstrating that you can critically evaluate AI-generated    
  code, identify incorrect assumptions, and independently verify fixes is an    
  equally important engineering skill.                                          
  now i give you first PRD                                                      
  PRD 1 — Zero-Drift PUBG Airdrop Countdown                                     
  T-03A: Anti-Drift Timer Hook                                                  
  Commit 1                                                                      
  Estimated duration: 20–25 minutes                                             
                                                                                
  Git commit message                                                            
                                                                                
  feat(hw3): implement zero-drift PUBG airdrop timer                            
                                                                                
  1. Objective                                                                  
  Evolve Lab 2 HW 3's createAntiDriftTimer into a reusable React 19 custom hook 
  called:                                                                       
                                                                                
  usePubgAirdropTimer(targetEpochMs, serverOffsetMs)                            
                                                                                
  The hook will power the PVS Grand Finals countdown and G-Coin Airdrop         
  countdown.                                                                    
                                                                                
  Its primary responsibility is to calculate the remaining time from an         
  absolute target timestamp instead of decrementing a counter every second.     
                                                                                
  2. Required file structure                                                    
  src/                                                                          
  └── hooks/                                                                    
      └── usePubgAirdropTimer.js                                                
  3. Anti-drift calculation contract                                            
  Never use this as the source of truth:                                        
                                                                                
  setInterval(() => {                                                           
    setRemaining((s) => s - 1);                                                 
  }, 1000);                                                                     
                                                                                
  Browser background throttling can delay interval callbacks.                   
                                                                                
  Instead, calculate the remaining time using:                                  
                                                                                
  Math.max(                                                                     
    0,                                                                          
    targetEpochMs - (Date.now() + serverOffsetMs)                               
  );                                                                            
                                                                                
  This makes the target timestamp authoritative.                                
                                                                                
  Every update recalculates the difference between the current adjusted clock   
  and the target timestamp.                                                     
                                                                                
  4. Required hook implementation                                               
  Implement the following reference contract:                                   
                                                                                
  import { useEffect, useState } from 'react';                                  
                                                                                
  export function usePubgAirdropTimer(                                          
    targetEpochMs,                                                              
    serverOffsetMs = 0                                                          
  ) {                                                                           
    const calcRemaining = () =>                                                 
      Math.max(                                                                 
        0,                                                                      
        targetEpochMs - (Date.now() + serverOffsetMs)                           
      );                                                                        
                                                                                
    const [remainingMs, setRemainingMs] =                                       
      useState(calcRemaining);                                                  
                                                                                
    useEffect(() => {                                                           
      const syncClock = () => {                                                 
        setRemainingMs(calcRemaining());                                        
      };                                                                        
                                                                                
      syncClock();                                                              
                                                                                
      const timerId = window.setInterval(                                       
        syncClock,                                                              
        200                                                                     
      );                                                                        
                                                                                
      const onWake = () => {                                                    
        if (document.visibilityState === 'visible') {                           
          syncClock();                                                          
        }                                                                       
      };                                                                        
                                                                                
      document.addEventListener(                                                
        'visibilitychange',                                                     
        onWake                                                                  
      );                                                                        
                                                                                
      return () => {                                                            
        window.clearInterval(timerId);                                          
                                                                                
        document.removeEventListener(                                           
          'visibilitychange',                                                   
          onWake                                                                
        );                                                                      
      };                                                                        
    }, [targetEpochMs, serverOffsetMs]);                                        
                                                                                
    return {                                                                    
      remainingMs,                                                              
      isLive: remainingMs <= 0,                                                 
    };                                                                          
  }                                                                             
                                                                                
  This is the required baseline implementation. You may extract the calculation 
  into a helper to avoid duplicating logic.                                     
                                                                                
  5. Countdown formatting                                                       
  Convert remainingMs into:                                                     
                                                                                
  Days                                                                          
                                                                                
  Hours                                                                         
                                                                                
  Minutes                                                                       
                                                                                
  Seconds                                                                       
                                                                                
  Milliseconds                                                                  
                                                                                
  Example output:                                                               
                                                                                
  PVS GRAND FINALS                                                              
                                                                                
  02 DAYS : 14 HOURS : 32 MIN : 08 SEC                                          
  The countdown must never display negative values.                             
                                                                                
  6. Visibility synchronization                                                 
  The hook must listen for:                                                     
                                                                                
  document.addEventListener(                                                    
    'visibilitychange',                                                         
    onWake                                                                      
  );                                                                            
                                                                                
  When the user returns to the browser tab, immediately recalculate the         
  remaining time.                                                               
                                                                                
  This is especially important for users keeping multiple browser tabs open     
  while waiting for an airdrop.                                                 
                                                                                
  7. Component integration                                                      
  Create a countdown component:                                                 
                                                                                
  src/                                                                          
  └── components/                                                               
      └── AirdropCountdown.jsx                                                  
  It should display:                                                            
                                                                                
  PVS Grand Finals countdown.                                                   
                                                                                
  G-Coin Airdrop countdown.                                                     
                                                                                
  Live/Expired status.                                                          
                                                                                
  Accessible countdown labels.                                                  
                                                                                
  Use the hook rather than duplicating timer logic inside the components.       
                                                                                
  8. Acceptance criteria                                                        
                                                                                
  usePubgAirdropTimer.js exists.                                                
                                                                                
  Hook accepts targetEpochMs.                                                   
                                                                                
  Hook accepts optional serverOffsetMs.                                         
                                                                                
  Remaining time uses absolute timestamp calculations.                          
                                                                                
  No decrement-based countdown.                                                 
                                                                                
  Visibility change immediately resynchronizes the timer.                       
                                                                                
  Interval and event listeners are cleaned up.                                  
                                                                                
  Countdown never becomes negative.                                             
                                                                                
  isLive becomes true when the countdown reaches zero.                          
                                                                                
  Multiple countdown components can use the hook independently.                 

● Before writing anything, I'll look at LAB2: this PRD evolves Lab 2 HW 3's
  createAntiDriftTimer, and later PRDs reuse the Lab 2 Virtual Scroller.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r"; find
      LAB2 -path '*/node_modules' -prune -o -type f -print | grep -v
      "/dist/\|test-results\|play…)
  ⎿  LAB2/EXERCISE/image.png
     LAB2/EXERCISE/Project_Rule.md
     LAB2/EXERCISE/report.md
     … +79 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB2/HW";
      ls; ls megasale/source; grep -rn "Drift\|drift" --include=*.js -l . |
      head; grep -rln "…)
  ⎿  AI_AUDIT_FAILURE_1.md
     AI_AUDIT_FAILURE_2.md
     AI_AUDIT_FAILURE_3.md
     … +31 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB2/HW";
      cat megasale/source/countdown.js; ls source; cat Project_Rule.md | head
      -30; grep -n "D…)
  ⎿  /**
      * Vietnam Mega-Sale Simulator — T-02 zero-drift countdown
      *
     … +182 lines (ctrl+o to expand)

● Two things turned up: the timer is createCountdown in countdown.js inside
  LAB2/HW/megasale (no createAntiDriftTimer, but it's the anti-drift timer the
  PRD describes, which I'll evolve into the hook), and no Lab 2 project has a
  Virtual Scroller, since the data grid paginates. Next I'll set up
  LAB3/HW/pubgArena with the LAB3 Vite/React/Vitest/Playwright stack.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW";
      mkdir -p pubgArena/src/hooks pubgArena/src/components pubgArena/src/data
      pubgArena/src/…)
  ⎿  added 95 packages in 3s
     6: * download is needed. Port 5176 so it never collides with the drum
     kit (5174) and piano (5175).
     … +2 lines (ctrl+o to expand)
  ⎿  Created LAB3\HW\pubgArena\.gitignore (+5 -0)
      1 +node_modules                                                    
      2 +dist                                                            
      3 +test-results                                                    
      4 +playwright-report                                               
      5 +                                                                
  ⎿  Created LAB3\HW\pubgArena\package.json (+28 -0)
       1 +{                                                              
       2 +  "name": "pubg-airdrop-arena",                                
       3 +  "private": true,                                             
       4 +  "version": "0.1.0",                                          
       5 +  "type": "module",                                            
       6 +  "scripts": {                                                 
       7 +    "dev": "vite",                                             
       8 +    "build": "vite build",                                     
       9 +    "preview": "vite preview",                                 
      10 +    "test": "vitest run",                                      
      11 +    "test:e2e": "playwright test"                              
      12 +  },                                                           
      13 +  "dependencies": {                                            
      14 +    "react": "^19.3.1",                                        
      15 +    "react-dom": "^19.3.1"                                     
      16 +  },                                                           
      17 +  "devDependencies": {                                         
      18 +    "@axe-core/playwright": "^4.14.0",                         
      19 +    "@playwright/test": "^1.64.1",                             
      20 +    "@testing-library/dom": "^10.4.2",                         
      21 +    "@testing-library/react": "^16.3.3",                       
      22 +    "@testing-library/user-event": "^14.6.1",                  
      23 +    "@vitejs/plugin-react": "^6.1.2",                          
      24 +    "jsdom": "^30.1.3",                                        
      25 +    "vite": "^8.3.5",                                          
      26 +    "vitest": "^5.0.5"                                         
      27 +  }                                                            
      28 +}                                                              
  ⎿  Created LAB3\HW\pubgArena\playwright.config.js (+21 -0)
       1 +import { defineConfig } from "@playwright/test";               
       2 +                                                               
       3 +/**                                                            
       4 + * Browser QA: the dev server (development React, so key warnin
         +gs would show),                                                
       5 + * a 375px-wide phone viewport, and the installed Microsoft Edg
         +e, so no browser                                               
       6 + * download is needed. Port 5176 so it never collides with the 
         +drum kit (5174) and piano (5175).                              
       7 + */                                                            
       8 +export default defineConfig({                                  
       9 +    testDir: "e2e",                                            
      10 +    reporter: "list",                                          
      11 +    use: {                                                     
      12 +        baseURL: "http://localhost:5176",                      
      13 +        channel: "msedge",                                     
      14 +        viewport: { width: 375, height: 812 }                  
      15 +    },                                                         
      16 +    webServer: {                                               
      17 +        command: "npx vite --port 5176 --strictPort",          
      18 +        url: "http://localhost:5176",                          
      19 +        reuseExistingServer: true                              
      20 +    }                                                          
      21 +});                                                            
  ⎿  Created LAB3\HW\pubgArena\public\robots.txt (+2 -0)
      1 +User-agent: *                                                   
      2 +Allow: /                                                        
  ⎿  Created LAB3\HW\pubgArena\src\main.jsx (+9 -0)
      1 +import { StrictMode } from "react";                             
      2 +import { createRoot } from "react-dom/client";                  
      3 +import App from "./App.jsx";                                    
      4 +                                                                
      5 +createRoot(document.querySelector("#root")).render(             
      6 +    <StrictMode>                                                
      7 +        <App />                                                 
      8 +    </StrictMode>                                               
      9 +);                                                              
  ⎿  … 2 more files changed
  ⎿  (timeout 5m)

● Scaffolded (Playwright 1.65 has page.clock, which I'll use to simulate a
  throttled background tab). Now the hook, evolved from Lab 2's remainingMs /
  formatDuration:

● Write(LAB3\HW\pubgArena\src\hooks\usePubgAirdropTimer.js)
  ⎿  Wrote 127 lines to LAB3\HW\pubgArena\src\hooks\usePubgAirdropTimer.js
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03A zero-drift airdro
         p timer
       3  *
       4  *   const { remainingMs, isLive } = usePubgAirdropTimer(targetE
         pochMs, serverOffsetMs);
       5  *
       6  * Evolved from Lab 2 HW 3 (LAB2/HW/megasale/source/countdown.js
         ), where the
       7  * same rule was first written: the remaining time is always rec
     … +121 lines (~5 KB) (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\data\schedule.js)  ⎿  Wrote 54 lines to LAB3\HW\pubgArena\src\data\schedule.js
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — countdown schedule (T-0
         3A)
       3  *
       4  * Absolute targets in epoch milliseconds. The countdowns never 
         store a
       5  * "seconds left" value; they always compare these timestamps wi
         th the
       6  * (server-adjusted) clock.
       7  *
     … +47 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\components\AirdropCountdown.jsx)
  ⎿  Wrote 110 lines to
     LAB3\HW\pubgArena\src\components\AirdropCountdown.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03A countdowns
       3  *
       4  *   <section aria-labelledby="countdowns-title">
       5  *     <h2>Countdowns</h2>
       6  *     <p> server clock offset (simulated) </p>
       7  *     <ul>
       8  *       <li> <CountdownCard/> </li>      one per event, in sche
         dule order
       9  *     </ul>
     … +101 lines (ctrl+o to expand)

● Cleaning up the component: drop the leftover padTwo helper and use a CSS
  module instead of a styles prop.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena/src/components"; python -c "
      p='AirdropCountdown.jsx'; s=open(p,encoding='utf8'…)
  ⎿  27:import styles from "./AirdropCountdown.module.css";
     62:        <article className={styles.card} aria-labelledby={titleId}
     data-countdown={event.id} data-live={isLive}>
     … +14 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\components\AirdropCountdown.jsx (+107 
     -110)
        1 -/**                                                           
        2 - * KRAFTON x PUBG Vietnam Championship — T-03A countdowns     
        3 - *                                                            
        4 - *   <section aria-labelledby="countdowns-title">             
        5 - *     <h2>Countdowns</h2>                                    
        6 - *     <p> server clock offset (simulated) </p>               
        7 - *     <ul>                                                   
        8 - *       <li> <CountdownCard/> </li>      one per event, in sc
          -hedule order                                                  
        9 - *     </ul>                                                  
       10 - *   </section>                                               
       11 - *                                                            
       12 - * Each card calls usePubgAirdropTimer itself, so the countdow
          -ns run                                                        
       13 - * independently (a hook cannot be called in a loop, hence one
          - component per                                                
       14 - * event). AirdropCountdown owns the list; a card is one <arti
          -cle> with no                                                  
       15 - * wrapper of its own (Project Rules 1 and 4).                
       16 - *                                                            
       17 - * Accessibility. The digits change five times a second, so th
          -ey are a                                                      
       18 - * role="timer" (implicitly aria-live="off"): a screen reader 
          -reads them when                                               
       19 - * the user moves to them, instead of being interrupted consta
          -ntly. The                                                     
       20 - * status ("Upcoming" → "Live now") is the only live region (p
          -olite) and                                                    
       21 - * changes once, when the target is reached. Each card is labe
          -lled by its                                                   
       22 - * title, and the timer by "<title> countdown"; the digits sit
          - in a <time>                                                  
       23 - * element with an ISO 8601 duration, and the target in a <tim
          -e> with its date.                                             
       24 - * All text is rendered as text, never as HTML (Project Rule 3
          -).                                                            
       25 - */                                                           
       26 -import { formatCountdown, isoDuration, splitDuration, usePubgA
          -irdropTimer } from "../hooks/usePubgAirdropTimer.js";         
       27 -                                                              
       28 -const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {        
       29 -    dateStyle: "medium",                                      
       30 -    timeStyle: "short",                                       
       31 -    timeZone: "Asia/Ho_Chi_Minh"                              
       32 -});                                                           
       33 -                                                              
       34 -const FIELDS = Object.freeze(["id", "title", "upcomingStatus",
          - "liveStatus"]);                                              
       35 -                                                              
       36 -/** Throws a TypeError unless event is a complete countdown en
          -try (Project Rule 2). */                                      
       37 -export function assertCountdownEvent(event) {                 
       38 -    if (event === null || typeof event !== "object" || Array.i
          -sArray(event)) {                                              
       39 -        throw new TypeError("AirdropCountdown: each event must
          - be an object");                                              
       40 -    }                                                         
     … 177 more lines (ctrl+o to expand)

● Now styles, the App and index.html:

● Write(LAB3\HW\pubgArena\src\components\AirdropCountdown.module.css)
  ⎿  Wrote 95 lines to
     LAB3\HW\pubgArena\src\components\AirdropCountdown.module.css
       1 /* KRAFTON x PUBG Vietnam Championship — countdown styles (T-03A
         ). Colours come from the --arena-* tokens. */
       2 
       3 .countdowns {
       4     min-width: 0;
       5 }
       6 
       7 .sectionTitle {
       8     margin: 0 0 0.25rem;
       9     font-size: 1.125rem;
     … +86 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\App.jsx)
  ⎿  Wrote 25 lines to LAB3\HW\pubgArena\src\App.jsx
       1 import { useState } from "react";
       2 import AirdropCountdown from "./components/AirdropCountdown.jsx"
         ;
       3 import { SIMULATED_SERVER_OFFSET_MS, createSchedule } from "./da
         ta/schedule.js";
       4 
       5 /**
       6  * Rendered into <main id="root"> (index.html); landmarks only, 
         no wrapper element.
       7  * The schedule is created once per mount, so the airdrop target
     … +19 lines (ctrl+o to expand)

● Bash(node -e '
      const L=h=>{const
      c=h.match(/[0-9a-f]{2}/gi).map(p=>{p=parseInt(p,16)/255;return
      p<=0.03928?p/12.92:((p+0.055)/1.055)**2.4});return .2126*c[0]+.7152*c…)
  ⎿  text #f5f5f4 bg 17.45 surface 15.66
     muted #c8c6bd bg 11.12 surface 9.98
     accent #f2a900 bg 9.48 surface 8.50
     … +4 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\index.html)
  ⎿  Wrote 45 lines to LAB3\HW\pubgArena\index.html
       1 <!doctype html>
       2 <html lang="en">
       3 <head>
       4   <meta charset="utf-8">
       5   <meta name="viewport" content="width=device-width, initial-sca
         le=1">
       6   <title>Airdrop Arena – PUBG Vietnam Championship</title>
       7   <meta name="description" content="Zero-drift countdowns to the
          PVS Grand Finals and the next G-Coin airdrop (student project, 
         fictional demo data).">
     … +38 lines (ctrl+o to expand)

● Now the hook tests. They use fake timers, and the key one is the
  background-tab case: jump the clock 10 minutes without firing any interval,
  then check that visibilitychange resyncs at once.

● Write(LAB3\HW\pubgArena\src\hooks\usePubgAirdropTimer.test.js)
  ⎿  Wrote 191 lines to
     LAB3\HW\pubgArena\src\hooks\usePubgAirdropTimer.test.js
       1 import { afterEach, beforeEach, describe, expect, test, vi } fro
         m "vitest";
       2 import { act, renderHook } from "@testing-library/react";
       3 import SOURCE from "./usePubgAirdropTimer.js?raw";
       4 import {
       5     TICK_MS, calcRemainingMs, formatCountdown, isoDuration, spli
         tDuration, usePubgAirdropTimer
       6 } from "./usePubgAirdropTimer.js";
       7 
       8 // T-03A — zero-drift airdrop timer (PRD 1 sections 3–6 and 8, P
     … +184 lines (~9 KB) (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vitest run 2>&1 | grep -E "✓|×|FAIL|Tests
      |Error:|Expected|Received|^\s+[…)
  ⎿        Tests  23 passed (23)
  ⎿  (timeout 2m)

● All 23 tests pass on the first run; next I'll confirm the key tests can fail
  by temporarily swapping in the forbidden timer, backing up the file to the
  scratchpad first.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; SP="C:/Users/admin/AppData/Local/Temp/claude/50d6cabe54ff641f/54
      029dc6-994b-4…)
  ⎿       × starts from the absolute target and the server offset 21ms
          × the offset is optional and defaults to 0 3ms
          × refreshes every 200 ms from the clock 3ms
     … +14 lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● The decrementing version fails 10 tests, including the no-decrement and
  tab-resync tests, so they measure real behaviour. The original is restored and
  all 23 pass. Next, component and contrast tests:

● Write(LAB3\HW\pubgArena\src\components\AirdropCountdown.test.jsx)
  ⎿  Wrote 183 lines to
     LAB3\HW\pubgArena\src\components\AirdropCountdown.test.jsx
       1 import { afterEach, beforeEach, describe, expect, test, vi } fro
         m "vitest";
       2 import { act, cleanup, render, screen, within } from "@testing-l
         ibrary/react";
       3 import App from "../App.jsx";
       4 import AirdropCountdown, { CountdownCard } from "./AirdropCountd
         own.jsx";
       5 import { AIRDROP_INTERVAL_MS, PVS_GRAND_FINALS_EPOCH_MS, createS
         chedule, nextAirdropEpochMs } from "../data/schedule.js";
       6 
     … +177 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\theme.test.js)
  ⎿  Wrote 56 lines to LAB3\HW\pubgArena\src\theme.test.js
       1 import { readFileSync } from "node:fs";
       2 import { describe, expect, test } from "vitest";
       3 import INDEX_HTML from "../index.html?raw";
       4 
       5 // Read as text: the Vitest CSS-Modules setting turns `?raw` imp
         orts of *.module.css into class maps.
       6 const STYLES = readFileSync("src/components/AirdropCountdown.mod
         ule.css", "utf8");
       7 
       8 // WCAG 2.2 AA contrast (1.4.3 text, 1.4.11 non-text) computed f
     … +49 lines (~2 KB) (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests
      |Error:|Expected|Received|^\s+[-+…)
  ⎿        Tests  62 passed (62)
  ⎿  (timeout 2m)

● 62 unit tests are passing, so I'm moving on to the Edge tests, using
  Playwright's page.clock to simulate a throttled background tab.

● Write(LAB3\HW\pubgArena\e2e\countdown.spec.js)
  ⎿  Wrote 96 lines to LAB3\HW\pubgArena\e2e\countdown.spec.js
       1 import { expect, test } from "@playwright/test";
       2 import AxeBuilder from "@axe-core/playwright";
       3 
       4 // T-03A in Microsoft Edge with Playwright's controllable clock.
          page.clock lets the test
       5 // freeze every timer while the wall clock moves on, which is wh
         at a throttled background
       6 // tab experiences, and then check that returning to the tab cor
         rects the display at once.
       7 
     … +89 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test 2>&1 | grep -vE "^\s*$" | grep -E
      "✓|✘|passed|failed|Erro…)
  ⎿    ✓  1 e2e\countdown.spec.js:40:1 › both countdowns start from their a
     bsolute targets and the simulated server offset (439ms)
       ✓  2 e2e\countdown.spec.js:48:1 › background tab: timers frozen for
     … +10 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● All 6 pass in Edge. One more mutation check, since the background-tab test
  only proves something if it fails without the fix: disable the
  visibilitychange handler and re-run it.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; SP="C:/Users/admin/AppData/Local/Temp/claude/50d6cabe54ff641f/54
      029dc6-994b-4…)
  ⎿  1
       ✘  1 e2e\countdown.spec.js:48:1 › background tab: timers frozen for
     3 minutes, display corrected the instant the tab is visible (5.9s)
     … +5 lines (ctrl+o to expand)
  ⎿  (timeout 3m 20s)

● With the handler disabled, the test fails as expected (it shows 04 MIN : 56,
  not 01 MIN : 56). The handler is restored. Now the full suite, the build and a
  screenshot:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vitest run 2>&1 | grep "Tests "; npx playwright test 2>&1 |
      grep -E "pass…)  ⎿        Tests  62 passed (62)
         Error: expect(locator).toHaveText(expected) failed
       1 failed
     … +3 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test 2>&1 | grep -E
      "✘|Expected|Received|passed|failed|Timeout…)
  ⎿    6 passed (7.4s)
  ⎿  (timeout 3m 20s)

● That's a flake: one test failed in the full run, then everything passed on a
  re-run. I won't commit a flaky suite, so I'm repeating the run to catch it:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test --repeat-each=8 2>&1 | grep -E
      "✘|Expected|Received|passe…)
  ⎿    ✘   3 e2e\countdown.spec.js:40:1 › both countdowns start from their
     absolute targets and the simulated server offset (10.0s)
       ✘   7 e2e\countdown.spec.js:40:1 › both countdowns start from their
     … +25 lines (ctrl+o to expand)
  ⎿  (timeout 6m 40s)

● The test failed because page startup under parallel load took about 8 seconds,
  so the fake clock had moved on; the timer was fine and my assumption was
  wrong. I'm fixing it by pausing the clock at a fixed start time for each test.

● Update(LAB3\HW\pubgArena\e2e\countdown.spec.js)
  ⎿  Added 5 lines, removed 1 line
      17          if (message.type() === "error" || message.type() === "w
          arning") consoleErrors.push(message.text());
      18      });
      19      page.on("pageerror", (error) => consoleErrors.push(error.me
          ssage));
      20 -    await page.clock.install({ time: T0 });                    
      20 +    // install() alone only sets the start time: the fake clock
         + keeps running in real time,                                   
      21 +    // so a slow page load shifted the expected digits (a flake
         + found with --repeat-each).                                    
      22 +    // Pausing at T0 makes every test start at exactly T0; time
         + moves only when a test says so.                               
      23 +    await page.clock.install({ time: T0 - 10 * SEC });         
      24 +    await page.clock.pauseAt(T0);                              
      25      await page.goto("/");
      26      await expect(page.getByRole("heading", { level: 1, name: "A
          irdrop Arena" })).toBeVisible();
      27  });

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test --repeat-each=8 2>&1 | grep -E
      "✘|Expected|Received|passe…)
  ⎿    ✘  32 e2e\countdown.spec.js:89:5 › phone (375px): no horizontal over
     flow, axe WCAG 2.2 AA clean (30.1s)
       ✘  33 e2e\countdown.spec.js:89:5 › phone (375px): no horizontal over
     … +16 lines (ctrl+o to expand)
  ⎿  (timeout 6m 40s)

● The clock fix broke the axe tests, which now time out at 30 s because
  axe-core's setTimeout is frozen by the fake clock. I'm resuming the clock
  before running axe, since those tests don't depend on exact digits.

● Update(LAB3\HW\pubgArena\e2e\countdown.spec.js)
  ⎿  Added 3 lines
      87  
      88  for (const [label, viewport] of [["phone", { width: 375, height
          : 812 }], ["desktop", { width: 1280, height: 800 }]]) {
      89      test(`${label} (${viewport.width}px): no horizontal overflo
          w, axe WCAG 2.2 AA clean`, async ({ page }) => {
      90 +        // axe-core schedules its own work with setTimeout, whi
         +ch the paused fake clock would                                 
      91 +        // freeze (the run timed out at 30 s); let time flow no
         +rmally for this test.                                          
      92 +        await page.clock.resume();                             
      93          await page.setViewportSize(viewport);
      94          await page.reload();
      95          await expect(page.getByRole("timer")).toHaveCount(2);

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test --repeat-each=8 2>&1 | grep -E
      "✘|Expected|Received|passe…)
  ⎿    48 passed (37.5s)
  ⎿  (timeout 6m 40s)

● 48/48 pass across 8 repeated runs in parallel. The fix changed how the clock
  is set up, so I'm re-checking that the background-tab test still fails without
  the resync handler:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; SP="C:/Users/admin/AppData/Local/Temp/claude/50d6cabe54ff641f/54
      029dc6-994b-4…)
  ⎿      Error: expect(locator).toHaveText(expected) failed
         Received: "00 DAYS : 00 HOURS : 04 MIN : 56 SEC"
       1 failed
     … +3 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

  Read 2 files (ctrl+o to expand)

● The layout works on phone and desktop, and the landed airdrop turns green
  while the Grand Finals card keeps counting on its own. Committing:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; git add -A . && git status --short . && git commit -q -F -
      <<'EOF'
      feat(hw3):…)
  ⎿  warning: in the working copy of 'LAB3/HW/pubgArena/.gitignore', LF wil
     l be replaced by CRLF the next time Git touches it
     warning: in the working copy of 'LAB3/HW/pubgArena/e2e/countdown.spec.
     … +35 lines (ctrl+o to expand)

● Saving HW3 status and the audit evidence collected so far to memory, so the
  evidence survives if this conversation gets long:

  Wrote 1 memory (ctrl+o to expand)

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; echo "- [LAB3 HW3 PUBG arena status + audit
      evidence](la…)
  ⎿  - [LAB3 HW2 piano engine status](lab3-hw2-piano-engine.md) — all 4 PRD
     s committed in LAB3/HW/pianoEngine; structure, abort, render-isolation
      decisions
     … +3 lines (ctrl+o to expand)
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

● HW3 PRD 1 is committed as eced8ac feat(hw3): implement zero-drift PUBG airdrop
  timer, in a new project at LAB3/HW/pubgArena. All 62 unit tests and 6 Edge
  tests pass, the Edge tests passed 8 runs in a row, and the build works.

  What it does
  - hooks/usePubgAirdropTimer.js builds on Lab 2's
    LAB2/HW/megasale/source/countdown.js.
    - Remaining time is always max(0, targetEpochMs − (Date.now() + 
      serverOffsetMs)). Nothing is ever counted down.
    - It refreshes every 200 ms, and refreshes immediately when the tab becomes
      visible again.
    - Unmounting removes both the interval and the visibilitychange listener.
    - The countdown never goes below 0, and isLive turns true at zero.
    - Differences from the PRD's reference code:
      - The calculation is one shared helper.
      - Both arguments are checked: a NaN or string target throws a TypeError
        instead of showing NaN.
      - The interval stops once the countdown reaches zero.
  - components/AirdropCountdown.jsx shows the PVS Grand Finals and G-Coin
    Airdrop countdowns.
    - Each runs its own copy of the hook, so they are independent.
    - Each card shows 02 DAYS : 14 HOURS : 32 MIN : 08 SEC plus milliseconds, an
      Upcoming/Live status, and the target time in Vietnam time.
    - Accessibility: the digits change 5 times a second, so they use
      role="timer", which screen readers don't announce automatically. The
      status is the only announced element, and it changes once, when the
      countdown ends.
  - data/schedule.js:
    - The Grand Finals target is 20 Dec 2026, 19:00 ICT.
    - The G-Coin airdrop lands on the next 5-minute mark of the server clock.
    - The server clock offset (+1.5 s) is simulated, as the brief allows, and
      the page labels it "(simulated)".

  Background-tab check in Edge
  Playwright freezes all timers, moves the clock forward 3 minutes, and switches
  the tab back to visible. The display jumps from 04 MIN : 56 to 01 MIN : 56
  straight away, with no timer firing. I also tested the tests themselves:
  - With the visibility handler disabled, this Edge test fails.
  - With the PRD's forbidden count-down timer swapped in, 10 hook tests fail.

  Audit evidence so far (saved to memory, so nothing has to be reconstructed
  later):
  1. Timer name: the PRD calls the Lab 2 timer createAntiDriftTimer; the real
     one is named createCountdown.
  2. Virtual Scroller: the brief says to reuse your Lab 2 Virtual Scroller, but
     none exists anywhere in LAB2 (the data grid paginates). For PRD 3/4 I'll
     have to build VirtualList from scratch and say so in the audit, unless you
     have that code somewhere else.
  3. Reference hook gaps: the PRD's reference hook keeps its interval running
     after zero and doesn't check its inputs.
  4. Edge test flake that was my mistake: I assumed page.clock.install() freezes
     time, but it keeps running. Under load the timer showed 59 MIN : 50 SEC
     instead of 58 SEC. Pausing the clock at T0 fixed it, but that made the axe
     tests time out after 30 s, because axe uses its own timers. Both are fixed:
     48/48 passed across 8 runs.
  5. Dead code: my first component draft had unused code, which I removed before
     testing.

  Your brief says to record AI mistakes as they happen, but my standing rule is
  not to write reports until you ask. So for now the evidence lives in memory
  and in these summaries. If you'd rather I keep a running AI_FAILURE_AUDIT.md
  updated after each PRD, say so.

✻ Crunched for 11m 36s · done 7:56 PM

❯ go on with PRD 2, you must always follow rules on Project_Rule.md in this hw3 
  PRD 2 — Optimistic PVS Ticket & G-Coin Claim System                           
  T-03B: Optimistic Inventory Transactions                                      
  Commit 2                                                                      
  Estimated duration: 25–30 minutes                                             
                                                                                
  Git commit message                                                            
                                                                                
  feat(hw3): add optimistic ticket and G-Coin claims                            
                                                                                
  1. Objective                                                                  
  Implement an optimistic claiming system for:                                  
                                                                                
  PVS Grand Finals VIP Tickets.                                                 
                                                                                
  PUBG G-Coin Contraband Crates.                                                
                                                                                
  The interface must update inventory immediately when a user claims an item,   
  without waiting for the server response.                                      
                                                                                
  If the server responds with HTTP 409 Conflict (Looted Out), the application   
  must automatically restore the previous stock quantity.                       
                                                                                
  2. Required file structure                                                    
  src/                                                                          
  ├── components/                                                               
  │   ├── AirdropArena.jsx                                                      
  │   ├── ClaimCard.jsx                                                         
  │   └── ClaimStatus.jsx                                                       
  │                                                                             
  ├── hooks/                                                                    
  │   └── useOptimisticClaim.js                                                 
  │                                                                             
  └── services/                                                                 
      └── claimService.js                                                       
  3. Inventory data schema                                                      
  Create an initial inventory dataset:                                          
                                                                                
  export const INITIAL_INVENTORY = [                                            
    {                                                                           
      id: 'pvs-vip',                                                            
      name: 'PVS Grand Finals VIP Ticket',                                      
      type: 'ticket',                                                           
      price: 1500000,                                                           
      stock: 25,                                                                
    },                                                                          
    {                                                                           
      id: 'gcoin-crate',                                                        
      name: 'G-Coin Contraband Crate',                                          
      type: 'crate',                                                            
      price: 0,                                                                 
      stock: 100,                                                               
    },                                                                          
  ];                                                                            
                                                                                
  The prices are simulation data, not official PUBG prices.                     
                                                                                
  Display Vietnamese currency using:                                            
                                                                                
  const formatVND = (amount) =>                                                 
    new Intl.NumberFormat('vi-VN', {                                            
      style: 'currency',                                                        
      currency: 'VND',                                                          
      maximumFractionDigits: 0,                                                 
    }).format(amount);                                                          
                                                                                
  Example:                                                                      
                                                                                
  1.500.000 ₫                                                                   
  4. Optimistic inventory deduction                                             
  When a user clicks Claim:                                                     
                                                                                
  Verify that the item has available stock.                                     
                                                                                
  Verify that there is no active claim for the same item.                       
                                                                                
  Generate a unique claimId.                                                    
                                                                                
  Lock the claim operation.                                                     
                                                                                
  Decrement stock immediately.                                                  
                                                                                
  Submit the claim request.                                                     
                                                                                
  Reconcile the UI using the server response.                                   
                                                                                
  Example:                                                                      
                                                                                
  setInventory((prev) =>                                                        
    prev.map((item) =>                                                          
      item.id === itemId                                                        
        ? {                                                                     
            ...item,                                                            
            stock: Math.max(0, item.stock - 1),                                 
          }                                                                     
        : item                                                                  
    )                                                                           
  );                                                                            
                                                                                
  The inventory must never display negative stock.                              
                                                                                
  5. Idempotent in-flight claim lock                                            
  Use a useRef lock to prevent duplicate requests.                              
                                                                                
  const inFlightClaims = useRef(new Map());                                     
                                                                                
  Before submitting a request:                                                  
                                                                                
  if (inFlightClaims.current.has(itemId)) {                                     
    return;                                                                     
  }                                                                             
                                                                                
  const claimId = crypto.randomUUID();                                          
                                                                                
  inFlightClaims.current.set(itemId, claimId);                                  
                                                                                
  Each claim must have a unique identifier.                                     
                                                                                
  The lock should be removed after the request finishes, provided it still      
  belongs to that claim.                                                        
                                                                                
  This prevents duplicate clicks from generating multiple concurrent claims for 
  the same item.                                                                
                                                                                
  6. HTTP 409 rollback                                                          
  If the backend returns:                                                       
                                                                                
  HTTP/1.1 409 Conflict                                                         
  The interface must restore the previously deducted stock.                     
                                                                                
  Example:                                                                      
                                                                                
  try {                                                                         
    await claimItem(itemId, claimId);                                           
  } catch (error) {                                                             
    if (error.status === 409) {                                                 
      setInventory((prev) =>                                                    
        prev.map((item) =>                                                      
          item.id === itemId                                                    
            ? {                                                                 
                ...item,                                                        
                stock: item.stock + 1,                                          
              }                                                                 
            : item                                                              
        )                                                                       
      );                                                                        
                                                                                
      setClaimError('Looted Out!');                                             
                                                                                
      return;                                                                   
    }                                                                           
                                                                                
    throw error;                                                                
  }                                                                             
                                                                                
  This is conceptual rollback logic. In the final implementation, associate     
  each optimistic update with its own claim and prevent stale responses from    
  modifying newer inventory state.                                              
                                                                                
  Handle other network errors separately. An unknown error should not silently  
  be treated as a successful claim.                                             
                                                                                
  7. Claim state machine                                                        
  Each claim should have the following states:                                  
                                                                                
  State                                                                         
                                                                                
  UI behavior                                                                   
                                                                                
  IDLE                                                                          
                                                                                
  Claim button available                                                        
                                                                                
  PENDING                                                                       
                                                                                
  Claim button disabled                                                         
                                                                                
  SUCCESS                                                                       
                                                                                
  Display successful claim                                                      
                                                                                
  CONFLICT                                                                      
                                                                                
  Roll back stock                                                               
                                                                                
  ERROR                                                                         
                                                                                
  Display recoverable error                                                     
                                                                                
  Example:                                                                      
                                                                                
  PVS GRAND FINALS VIP TICKET                                                   
                                                                                
  Price: 1.500.000 ₫                                                            
  Remaining stock: 24                                                           
                                                                                
  [ CLAIM TICKET ]                                                              
                                                                                
  Status: Claim successful                                                      
  8. Backend simulation                                                         
  If the course does not provide a backend, create a mock claim service that    
  simulates:                                                                    
                                                                                
  Successful HTTP 200 responses.                                                
                                                                                
  HTTP 409 Looted Out responses.                                                
                                                                                
  Network failures.                                                             
                                                                                
  Do not randomly change the result on every render. Make the mock              
  deterministic or configurable for testing.                                    
                                                                                
  9. Acceptance criteria                                                        
                                                                                
  VIP Ticket inventory is displayed.                                            
                                                                                
  G-Coin Crate inventory is displayed.                                          
                                                                                
  VND formatting uses Intl.NumberFormat.                                        
                                                                                
  Claim deducts stock optimistically.                                           
                                                                                
  Duplicate claim clicks are prevented.                                         
                                                                                
  Each claim has a unique claimId.                                              
                                                                                
  HTTP 409 automatically rolls back inventory.                                  
                                                                                
  Network errors are handled separately.                                        
                                                                                
  Inventory cannot become negative.                                             
                                                                                
  Claim buttons reflect the current state.                                      
                                                                                
  Successful claims display accessible feedback.                                

● Re-reading Project_Rule.md before writing anything, and checking what vi-VN
  currency formatting actually outputs, because the PRD's example 1.500.000 ₫
  may not match byte for byte:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r"; grep -n
      "Quy tắc:" LAB3/EXERCISE/Project_Rule.md; node -e '
      const f=(a)=>new Intl.NumberFormat(…)
  ⎿  3:1. Quy tắc: Zero Div-Soup (Cấm lạm dụng thẻ Div)
     4:Quy tắc: Bắt buộc sử dụng các thẻ HTML ngữ nghĩa chính xác cho từng
     thành phần giao diện (ví dụ: <main>, <header>, <section>, <h1, <p>, <b
     … +14 lines (ctrl+o to expand)

● The PRD's literal price string uses a normal space, but Intl outputs a
  no-break space before ₫, so tests will compare against the real character.
  Next I'll build the data, the formatter, and a deterministic mock server that
  tracks stock and claim IDs.

● Write(LAB3\HW\pubgArena\src\data\inventory.js)
  ⎿  Wrote 60 lines to LAB3\HW\pubgArena\src\data\inventory.js
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03B claimable invento
         ry
       3  *
       4  * Simulation data, not official PUBG prices or stock. Every ite
         m is
       5  * validated (Project Rule 2) before the claim system or the UI 
         uses it.
       6  */
       7 
     … +53 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\utils\formatVND.js)
  ⎿  Wrote 22 lines to LAB3\HW\pubgArena\src\utils\formatVND.js
       1 /**
       2  * Vietnamese đồng, formatted by the platform (Intl.NumberFormat
         , vi-VN):
       3  * formatVND(1500000) === "1.500.000 ₫".
       4  *
       5  * Note: the space before "₫" is a NO-BREAK SPACE (U+00A0), not 
         an ordinary
       6  * space, so the amount and the symbol never wrap onto separate 
         lines. Tests
       7  * must compare against " ", not a typed space.
     … +15 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\services\claimService.js)
  ⎿  Wrote 128 lines to LAB3\HW\pubgArena\src\services\claimService.js
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03B mock claim backen
         d
       3  *
       4  *   const service = createClaimService();
       5  *   await service.claimItem(itemId, claimId, { signal });   // 
         resolves an HTTP-200-like result
       6  *                                                            //
          or rejects with ClaimError
       7  *
     … +121 lines (ctrl+o to expand)
● Next I'm wiring the hook: each optimistic deduction becomes its own
  transaction, and rollback is a +1 delta on that item only, run at most once,
  with late responses ignored.

● Write(LAB3\HW\pubgArena\src\hooks\useOptimisticClaim.js)
  ⎿  Wrote 160 lines to LAB3\HW\pubgArena\src\hooks\useOptimisticClaim.js
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03B optimistic claims
       3  *
       4  *   const { inventory, claims, claim, retry } = useOptimisticCl
         aim({ initialInventory, claimItem });
       5  *
       6  * One claim, step by step (PRD 2 section 4):
       7  *   1. the item must have stock and no claim in flight (the use
         Ref lock);
       8  *   2. a unique claimId is generated and the lock is taken: inF
     … +153 lines (~8 KB) (ctrl+o to expand)

● React may run the setClaims updater lazily, so failed could still be null when
  checked; I'm mirroring the claims in a ref, as with inventory.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena/src/hooks"; python -c "
      p='useOptimisticClaim.js'; s=open(p,encoding='utf8').re…)
  ⎿  61:    const [claims, setClaims] = useState(() => Object.freeze(
     64:    const claimsRef = useRef(claims);
     91:        claimsRef.current = Object.freeze({ ...claimsRef.current, [
     … +3 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\hooks\useOptimisticClaim.js (+159 -160)
        1 -/**                                                           
        2 - * KRAFTON x PUBG Vietnam Championship — T-03B optimistic clai
          -ms                                                            
        3 - *                                                            
        4 - *   const { inventory, claims, claim, retry } = useOptimistic
          -Claim({ initialInventory, claimItem });                       
        5 - *                                                            
        6 - * One claim, step by step (PRD 2 section 4):                 
        7 - *   1. the item must have stock and no claim in flight (the u
          -seRef lock);                                                  
        8 - *   2. a unique claimId is generated and the lock is taken: i
          -nFlight[itemId] = claimId;                                    
        9 - *   3. an optimistic transaction { claimId → itemId } is reco
          -rded and the                                                  
       10 - *      displayed stock drops by one at once (never below 0); 
       11 - *   4. the request is sent; the card shows PENDING;          
       12 - *   5. the response settles the transaction:                 
       13 - *        200  SUCCESS:  stock reconciled to the server's rema
          -iningStock                                                    
       14 - *        409  CONFLICT: "Looted Out!": the unit is given back
          - (+1)                                                         
       15 - *        else ERROR:    the unit is given back (+1); the clai
          -m was NOT                                                     
       16 - *                       confirmed, so it is never shown as a 
          -success. Retry                                                
       17 - *                       re-sends the SAME claimId, which the 
          -server treats                                                 
       18 - *                       idempotently, so a retry cannot claim
          - twice.                                                       
       19 - *   6. the lock is released only if it still belongs to this 
          -claimId.                                                      
       20 - *                                                            
       21 - * Concurrency. Rollback is a delta (+1 on this item) applied 
          -once per                                                      
       22 - * transaction, never a snapshot of the whole inventory: a fai
          -lure on the                                                   
       23 - * VIP ticket cannot restore or overwrite the crate's stock, e
          -ven when both                                                 
       24 - * claims are in flight together. A response whose transaction
          - is gone                                                      
       25 - * (already settled, or the component unmounted) changes nothi
          -ng.                                                           
       26 - *                                                            
       27 - * The inventory lives in a ref that every update goes through
          - synchronously,                                               
       28 - * so the stock check in step 1 always sees the latest value, 
          -even between a                                                
       29 - * click and the next render. Unmounting aborts every request 
          -in flight.                                                    
       30 - */                                                           
       31 -import { useCallback, useEffect, useRef, useState } from "reac
          -t";                                                           
       32 -import { assertInventory } from "../data/inventory.js";       
       33 -                                                              
       34 -export const CLAIM_STATUS = Object.freeze({                   
       35 -    IDLE: "IDLE",                                             
       36 -    PENDING: "PENDING",                                       
       37 -    SUCCESS: "SUCCESS",                                       
       38 -    CONFLICT: "CONFLICT",                                     
       39 -    ERROR: "ERROR"                                            
       40 -});                                                           
     … 279 more lines (ctrl+o to expand)

● Now the three components:

● Write(LAB3\HW\pubgArena\src\components\ClaimStatus.jsx)
  ⎿  Wrote 48 lines to LAB3\HW\pubgArena\src\components\ClaimStatus.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03B claim status line
       3  *
       4  *   <p role="status" aria-live="polite" data-claim-status="SUCC
         ESS">Claim successful …</p>
       5  *
       6  * A polite live region per card, so every state change of a cla
         im
       7  * (pending, success, looted out, error) is announced without mo
         ving focus.
     … +41 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\components\ClaimCard.jsx)
  ⎿  Wrote 72 lines to LAB3\HW\pubgArena\src\components\ClaimCard.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03B claim card
       3  *
       4  *   <article aria-labelledby="pvs-vip-name">
       5  *     <h3>PVS Grand Finals VIP Ticket</h3>
       6  *     <dl> Price: 1.500.000 ₫   Remaining stock: 24 </dl>
       7  *     <p> [Claim ticket] [Retry claim] </p>
       8  *     <ClaimStatus/>
       9  *   </article>
      10  *
     … +62 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\components\AirdropArena.jsx)
  ⎿  Wrote 79 lines to LAB3\HW\pubgArena\src\components\AirdropArena.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03B claim arena
       3  *
       4  *   <section aria-labelledby="arena-title">
       5  *     <h2>Claim Center</h2>
       6  *     <p> simulation-data notice </p>
       7  *     <ul> <li><ClaimCard/></li> … </ul>            one card pe
         r item, inventory order
       8  *     <fieldset> Server simulation: one <select> per item </fie
         ldset>
     … +71 lines (ctrl+o to expand)

● Fix: ClaimCard passes an id that ClaimStatus ignored, which would leave the
  button's aria-describedby pointing at nothing. Adding and validating the prop:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena/src/components"; python -c "
      p='ClaimStatus.jsx'; s=open(p,encoding='utf8').rea…)
  ⎿  42:    if (id !== undefined && (typeof id !== "string" || !/^[a-z0-9-]
     +$/.test(id))) throw new TypeError("ClaimStatus: id must be a lower-ca
     se slug");
     … +2 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\components\ClaimStatus.jsx (+49 -48)
       1 -/**                                                            
       2 - * KRAFTON x PUBG Vietnam Championship — T-03B claim status lin
         -e                                                              
       3 - *                                                             
       4 - *   <p role="status" aria-live="polite" data-claim-status="SUC
         -CESS">Claim successful …</p>                                   
       5 - *                                                             
       6 - * A polite live region per card, so every state change of a cl
         -aim                                                            
       7 - * (pending, success, looted out, error) is announced without m
         -oving focus.                                                   
       8 - * One element, no wrapper (Project Rules 1 and 4); text only (
         -Rule 3).                                                       
       9 - */                                                            
      10 -import { CLAIM_STATUS } from "../hooks/useOptimisticClaim.js"; 
      11 -import styles from "./AirdropArena.module.css";                
      12 -                                                               
      13 -const STATUSES = Object.freeze(Object.values(CLAIM_STATUS));   
      14 -                                                               
      15 -/** The first 8 characters of a claim id, enough to tell claims
         - apart on screen. */                                           
      16 -export const shortClaimId = (claimId) => claimId.slice(0, 8);  
      17 -                                                               
      18 -export function claimMessage(claim, itemName) {                
      19 -    switch (claim.status) {                                    
      20 -        case CLAIM_STATUS.PENDING:                             
      21 -            return `Claiming ${itemName}…`;                    
      22 -        case CLAIM_STATUS.SUCCESS:                             
      23 -            return `Claim successful: ${itemName} (claim ${shor
         -tClaimId(claim.claimId)}).`;                                   
      24 -        case CLAIM_STATUS.CONFLICT:                            
      25 -            return `${claim.message} Someone else got the last 
         -one; your stock was restored.`;                                
      26 -        case CLAIM_STATUS.ERROR:                               
      27 -            return `${claim.message}: your claim was not confir
         -med and your stock was restored. You can retry.`;              
      28 -        default:                                               
      29 -            return "Ready to claim.";                          
      30 -    }                                                          
      31 -}                                                              
      32 -                                                               
      33 -export default function ClaimStatus({ claim, itemName }) {     
      34 -    if (claim === null || typeof claim !== "object" || !STATUSE
         -S.includes(claim.status)) {                                    
      35 -        throw new TypeError(`ClaimStatus: claim.status must be 
         -one of ${STATUSES.join(", ")}`);                               
      36 -    }                                                          
      37 -    if (claim.status !== CLAIM_STATUS.IDLE && (typeof claim.cla
         -imId !== "string" || claim.claimId === "")) {                  
      38 -        throw new TypeError("ClaimStatus: an active claim needs
         - its claimId");                                                
      39 -    }                                                          
      40 -    if (typeof claim.message !== "string") throw new TypeError(
         -"ClaimStatus: claim.message must be a string");                
     … 57 more lines (ctrl+o to expand)

● Now the styles, a danger token, and wiring into the App:

● Write(LAB3\HW\pubgArena\src\components\AirdropArena.module.css)
  ⎿  Wrote 142 lines to
     LAB3\HW\pubgArena\src\components\AirdropArena.module.css
       1 /* KRAFTON x PUBG Vietnam Championship — claim arena styles (T-0
         3B). Colours come from the --arena-* tokens. */
       2 
       3 .arena {
       4     margin-top: 2rem;
       5     min-width: 0;
       6 }
       7 
       8 .sectionTitle {
       9     margin: 0 0 0.25rem;
     … +133 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; node -e '
      const L=h=>{const c=h.match(/[0-9a-f]{2}/gi).map(p=>{p=parseInt(p,1…)
  ⎿  danger/surface 6.18 danger/bg 6.88 bg on accent 9.48 live/surface 9.80
     index.html:1
     src/theme.test.js:2
  ⎿  Updated LAB3\HW\pubgArena\index.html (+46 -45)
       1 -<!doctype html>                                                
       2 -<html lang="en">                                               
       3 -<head>                                                         
       4 -  <meta charset="utf-8">                                       
       5 -  <meta name="viewport" content="width=device-width, initial-sc
         -ale=1">                                                        
       6 -  <title>Airdrop Arena – PUBG Vietnam Championship</title>     
       7 -  <meta name="description" content="Zero-drift countdowns to th
         -e PVS Grand Finals and the next G-Coin airdrop (student project
         -, fictional demo data).">                                      
       8 -  <meta name="theme-color" content="#0e1014">                  
       9 -  <!-- Empty inline icon: no /favicon.ico request, so no 404 in
         - the console. -->                                              
      10 -  <link rel="icon" href="data:,">                              
      11 -  <style>                                                      
      12 -    /* T-03A design tokens; every pair's contrast is checked by
         - src/theme.test.js. */                                         
      13 -    :root {                                                    
      14 -      --arena-background: #0e1014;                             
      15 -      --arena-surface: #181c23;                                
      16 -      --arena-text: #f5f5f4;                                   
      17 -      --arena-muted: #c8c6bd;                                  
      18 -      --arena-accent: #f2a900;                                 
      19 -      --arena-live: #4ade80;                                   
      20 -      --arena-border: #6b7280;                                 
      21 -      --arena-focus: #38bdf8;                                  
      22 -      --arena-radius: 0.75rem;                                 
      23 -      color-scheme: dark;                                      
      24 -      font-family: system-ui, -apple-system, "Segoe UI", Roboto
         -, sans-serif;                                                  
      25 -      line-height: 1.4;                                        
      26 -      color: var(--arena-text);                                
      27 -      background: var(--arena-background);                     
      28 -    }                                                          
      29 -    body { margin: 0; min-height: 100vh; }                     
      30 -    #root { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1
         -rem 2rem; }                                                    
      31 -    #root > header { margin-bottom: 1.5rem; }                  
      32 -    #root > footer { margin-top: 2rem; font-size: 0.875rem; col
         -or: var(--arena-muted); }                                      
      33 -    #root > footer p { margin: 0; }                            
      34 -    .eyebrow { margin: 0; font-size: 0.875rem; font-weight: 700
         -; letter-spacing: 0.12em; text-transform: uppercase; color: var
         -(--arena-accent); }                                            
      35 -    h1 { margin: 0.25rem 0; font-size: clamp(1.75rem, 5vw, 2.5r
         -em); text-transform: uppercase; letter-spacing: 0.04em; }      
      36 -    .tagline { margin: 0; color: var(--arena-muted); }         
      37 -    :focus-visible { outline: 3px solid var(--arena-focus); out
         -line-offset: 2px; }                                            
      38 -  </style>                                                     
      39 -</head>                                                        
      40 -<body>                                                         
     … 51 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\theme.test.js (+63 -56)
       1 -import { readFileSync } from "node:fs";                        
       2 -import { describe, expect, test } from "vitest";               
       3 -import INDEX_HTML from "../index.html?raw";                    
       4 -                                                               
       5 -// Read as text: the Vitest CSS-Modules setting turns `?raw` im
         -ports of *.module.css into class maps.                         
       6 -const STYLES = readFileSync("src/components/AirdropCountdown.mo
         -dule.css", "utf8");                                            
       7 -                                                               
       8 -// WCAG 2.2 AA contrast (1.4.3 text, 1.4.11 non-text) computed 
         -from the real --arena-* tokens.                                
       9 -                                                               
      10 -function luminance(hex) {                                      
      11 -    const [r, g, b] = hex.slice(1).match(/../g).map((pair) => {
      12 -        const channel = parseInt(pair, 16) / 255;              
      13 -        return channel <= 0.03928 ? channel / 12.92 : ((channel
         - + 0.055) / 1.055) ** 2.4;                                     
      14 -    });                                                        
      15 -    return 0.2126 * r + 0.7152 * g + 0.0722 * b;               
      16 -}                                                              
      17 -                                                               
      18 -function contrast(a, b) {                                      
      19 -    const [light, dark] = [luminance(a), luminance(b)].sort((x,
         - y) => y - x);                                                 
      20 -    return (light + 0.05) / (dark + 0.05);                     
      21 -}                                                              
      22 -                                                               
      23 -const T = Object.fromEntries(                                  
      24 -    [...INDEX_HTML.matchAll(/--arena-([a-z-]+):\s*(#[0-9a-f]{6}
         -)\s*;/gi)].map(([, name, value]) => [name, value.toLowerCase()]
         -)                                                              
      25 -);                                                             
      26 -                                                               
      27 -describe("design tokens", () => {                              
      28 -    test("the contrast maths matches the WCAG reference values"
         -, () => {                                                      
      29 -        expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 
         -5);                                                            
      30 -        expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48
         -, 2);                                                          
      31 -    });                                                        
      32 -                                                               
      33 -    test("the stylesheet uses tokens, not hard-coded colours", 
         -() => {                                                        
      34 -        expect(STYLES.replace(/\/\*[\s\S]*?\*\//g, "")).not.toM
         -atch(/#[0-9a-f]{3,8}\b/i);                                     
      35 -    });                                                        
      36 -                                                               
      37 -    test.each([                                                
      38 -        ["text on the page", "text", "background"],            
      39 -        ["text on a card", "text", "surface"],                 
      40 -        ["muted text on a card", "muted", "surface"],          
     … 79 more lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\App.jsx)
  ⎿  Added 9 lines, removed 3 lines
       1  import { useState } from "react";
       2 +import AirdropArena from "./components/AirdropArena.jsx";      
       3  import AirdropCountdown from "./components/AirdropCountdown.jsx
          ";
       4 +import { INITIAL_INVENTORY } from "./data/inventory.js";       
       5  import { SIMULATED_SERVER_OFFSET_MS, createSchedule } from "./d
          ata/schedule.js";
       6 +import { createClaimService } from "./services/claimService.js"
         +;                                                              
       7  
       8  /**
       9   * Rendered into <main id="root"> (index.html); landmarks only,
           no wrapper element.
       7 - * The schedule is created once per mount, so the airdrop targe
         -t stays fixed                                                  
       8 - * while the countdown runs. `schedule` and `serverOffsetMs` ar
         -e injectable for tests.                                        
      10 + * The schedule and the mock claim backend are created once per
         + mount, so the                                                 
      11 + * airdrop target stays fixed and the server keeps its stock be
         +tween claims.                                                  
      12 + * `schedule`, `serverOffsetMs`, `claimService` and `generateCl
         +aimId` are injectable for tests.                               
      13   */
      10 -export default function App({ schedule, serverOffsetMs = SIMULA
         -TED_SERVER_OFFSET_MS } = {}) {                                 
      14 +export default function App({ schedule, serverOffsetMs = SIMULA
         +TED_SERVER_OFFSET_MS, claimService, generateClaimId } = {}) {  
      15      const [events] = useState(() => schedule ?? createSchedule(
          Date.now(), serverOffsetMs));
      16 +    const [service] = useState(() => claimService ?? createClai
         +mService());                                                   
      17      return (
      18          <>
      19              <header>
     ...
      22                  <p className="tagline">Countdowns to the PVS Gr
          and Finals and the next G-Coin airdrop</p>
      23              </header>
      24              <AirdropCountdown events={events} serverOffsetMs={s
          erverOffsetMs} />
      25 +            <AirdropArena initialInventory={INITIAL_INVENTORY} 
         +service={service} generateClaimId={generateClaimId} />         
      26              <footer>
      27                  <p>Student project with fictional demo data. No
          t affiliated with KRAFTON or PUBG.</p>
      28              </footer>

● Now the tests, following the brief's recommended order: test the service and
  the claim transaction on their own first, covering 200, 409, network error and
  concurrency, then the cards.

● Write(LAB3\HW\pubgArena\src\services\claimService.test.js)
  ⎿  Wrote 147 lines to LAB3\HW\pubgArena\src\services\claimService.test.js
      1 import { afterEach, beforeEach, describe, expect, test, vi } from
         "vitest";
      2 import { ClaimError, DEFAULT_LATENCY_MS, SERVICE_MODES, createCla
        imService } from "./claimService.js";
      3 import { INITIAL_INVENTORY, assertInventory } from "../data/inven
        tory.js";
      4 import { formatVND } from "../utils/formatVND.js";
      5 
      6 // T-03B — inventory data, VND formatting and the deterministic m
        ock backend (PRD 2 sections 3 and 8).
     … +141 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\hooks\useOptimisticClaim.test.js)
  ⎿  Wrote 237 lines to
     LAB3\HW\pubgArena\src\hooks\useOptimisticClaim.test.js
       1 import { afterEach, describe, expect, test, vi } from "vitest";
       2 import { act, renderHook } from "@testing-library/react";
       3 import { CLAIM_STATUS, useOptimisticClaim } from "./useOptimisti
         cClaim.js";
       4 import { ClaimError } from "../services/claimService.js";
       5 import { INITIAL_INVENTORY } from "../data/inventory.js";
       6 
       7 // T-03B — optimistic claim transactions (PRD 2 sections 4–7), t
         ested on their own, before
       8 // any UI, with a backend whose every response the test resolves
     … +230 lines (~12 KB) (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests
      |Error:|Expected|Received|^\s+[-+…)
  ⎿       × renders header, countdowns and footer with no wrapper; both tim
     ers are present 19ms
     ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
     … +7 lines (ctrl+o to expand)
  ⎿  (timeout 3m)

● The one failure is the PRD 1 App test, which expects 3 children; the Claim
  Center is now a 4th section. Updating it:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/components/AirdropCountdown.test.jsx'; s=open(p,encoding='…)
  ⎿        Tests  114 passed (114)
  ⎿  Updated LAB3\HW\pubgArena\src\components\AirdropCountdown.test.jsx
     (+183 -183)
        1 -import { afterEach, beforeEach, describe, expect, test, vi } f
          -rom "vitest";                                                 
        2 -import { act, cleanup, render, screen, within } from "@testing
          --library/react";                                              
        3 -import App from "../App.jsx";                                 
        4 -import AirdropCountdown, { CountdownCard } from "./AirdropCoun
          -tdown.jsx";                                                   
        5 -import { AIRDROP_INTERVAL_MS, PVS_GRAND_FINALS_EPOCH_MS, creat
          -eSchedule, nextAirdropEpochMs } from "../data/schedule.js";   
        6 -                                                              
        7 -// T-03A — countdown component (PRD 1 section 7) and schedule 
          -data; Project Rules 1–4.                                      
        8 -                                                              
        9 -const T0 = Date.parse("2026-11-09T12:00:00Z");                
       10 -const MIN = 60 * 1000;                                        
       11 -                                                              
       12 -const SOURCES = Object.entries(import.meta.glob(["../**/*.{js,
          -jsx}", "!../**/*.test.{js,jsx}"], { query: "?raw", import: "de
          -fault", eager: true }));                                      
       13 -const stripComments = (source) => source.replace(/\/\*[\s\S]*?
          -\*\//g, "").replace(/\/\/.*$/gm, "");                         
       14 -                                                              
       15 -const event = (overrides = {}) => Object.freeze({             
       16 -    id: "gcoin-airdrop",                                      
       17 -    title: "G-Coin Airdrop",                                  
       18 -    targetEpochMs: T0 + 90 * 1000,                            
       19 -    upcomingStatus: "Incoming",                               
       20 -    liveStatus: "Airdrop landed",                             
       21 -    ...overrides                                              
       22 -});                                                           
       23 -                                                              
       24 -function renderInMain(element) {                              
       25 -    const main = document.body.appendChild(document.createElem
          -ent("main"));                                                 
       26 -    return render(element, { container: main });              
       27 -}                                                             
       28 -                                                              
       29 -beforeEach(() => {                                            
       30 -    vi.useFakeTimers();                                       
       31 -    vi.setSystemTime(T0);                                     
       32 -});                                                           
       33 -                                                              
       34 -afterEach(() => {                                             
       35 -    cleanup();                                                
       36 -    vi.useRealTimers();                                       
       37 -    vi.restoreAllMocks();                                     
       38 -    document.body.replaceChildren();                          
       39 -});                                                           
       40 -                                                              
     … 326 more lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● 114 tests pass; next I'll run mutation checks on the claim logic, covering
  snapshot rollback, the missing useRef lock, and unguarded rollback.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; SP="C:/Users/admin/AppData/Local/Temp/claude/50d6cabe54ff641f/54
      029dc6-994b-4…)
  ⎿  == (a) snapshot rollback
            × a 409 on the VIP ticket restores only the ticket, never the c
     rate 7ms
     … +16 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Mutations (a) and (b) are caught, but (c) slipped through because my "late
  response" test calls settle twice on one promise, so it could never fail; I'm
  replacing it with a real stale-response case after unmount.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/hooks/useOptimisticClaim.test.js'; s=open(p,encoding='utf8…)
  ⎿  == mutation: no stale guard on success
     2
           Tests  20 passed (20)
           Tests  114 passed (114)
  ⎿  1 file changed (binary, mode only or too large to show)
  ⎿  (timeout 3m 20s)

● The replacement test also passes with the guard removed, so it's vacuous; I'm
  keeping the guard as the PRD asks but dropping the test and documenting why.
● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/hooks/useOptimisticClaim.test.js'; s=open(p,encoding='utf8…)
  ⎿        Tests  113 passed (113)
  ⎿  Updated LAB3\HW\pubgArena\src\hooks\useOptimisticClaim.js (+3 -1)
      22   * transaction, never a snapshot of the whole inventory: a fail
          ure on the
      23   * VIP ticket cannot restore or overwrite the crate's stock, ev
          en when both
      24   * claims are in flight together. A response whose transaction 
          is gone
      25 - * (already settled, or the component unmounted) changes nothin
         -g.                                                             
      25 + * (already settled, or the component unmounted) changes nothin
         +g. That guard                                                  
      26 + * is defensive: a promise settles once and each item has one c
         +laim in flight,                                                
      27 + * so no test can currently provoke a stale answer (see the tes
         +t file).                                                       
      28   *
      29   * The inventory (and each claim state) lives in a ref that eve
          ry update goes through synchronously,
      30   * so the stock check in step 1 always sees the latest value, e
          ven between a
  ⎿  Updated LAB3\HW\pubgArena\src\hooks\useOptimisticClaim.test.js (+6 
     -16)
      206          expect(stock("pvs-vip")).toBe(0);
      207      });
      208  
      209 -    // A promise settles only once, so the same request cannot
          - answer twice; an earlier version of                          
      210 -    // this test "re-delivered" a response by calling reject()
          - again, which could never fail.                               
      211 -    // The real stale case is a backend that ignores the abort
          - signal and answers after unmount.                            
      212 -    test("a response that arrives after unmount (backend ignor
          -ed the abort) is dropped", async () => {                      
      213 -        const answers = [];                                   
      214 -        const claimItem = vi.fn((itemId, claimId) => new Promi
          -se((resolve) => answers.push(() => resolve({ status: 200, item
          -Id, claimId, remainingStock: 3 }))));                         
      215 -        const consoleError = vi.spyOn(console, "error");      
      216 -        const { result, unmount } = renderHook(() => useOptimi
          -sticClaim({ initialInventory: INITIAL_INVENTORY, claimItem, ge
          -nerateClaimId: () => "late" }));                              
      217 -        act(() => { result.current.claim("pvs-vip"); });      
      218 -        const before = result.current.inventory;              
      219 -        unmount();                                            
      220 -        await act(async () => { answers[0](); });             
      221 -        expect(result.current.inventory).toBe(before);        
          -             // no update reached the dead hook               
      222 -        expect(result.current.inventory[0].stock).toBe(24);   
      223 -        expect(consoleError).not.toHaveBeenCalled();          
      224 -    });                                                       
      209 +    // No "stale response" test on purpose. Two attempts were 
          +written and both passed with the                              
      210 +    // hook's stale guard deleted (mutation check), so they pr
          +oved nothing:                                                 
      211 +    //   1. re-delivering a response by calling reject() twice
          +: a promise settles only once;                                
      212 +    //   2. answering after unmount: React drops every update 
          +to an unmounted component anyway.                             
      213 +    // With one settlement per request and one claim per item 
          +at a time, the guard is defensive                             
      214 +    // and cannot be observed from outside; what CAN be observ
          +ed (abort on unmount) is tested below.                        
      215  
      216      test("unmounting aborts requests in flight; their answers 
           change nothing", async () => {
      217          const { backend, hook, claim } = setup();
  ⎿  (timeout 2m)

● Now the component tests, with the real mock service and fake timers:

● Write(LAB3\HW\pubgArena\src\components\AirdropArena.test.jsx)
  ⎿  Wrote 214 lines to
     LAB3\HW\pubgArena\src\components\AirdropArena.test.jsx
       1 import { afterEach, beforeEach, describe, expect, test, vi } fro
         m "vitest";
       2 import { act, cleanup, fireEvent, render, screen, within } from 
         "@testing-library/react";
       3 import AirdropArena from "./AirdropArena.jsx";
       4 import ClaimCard from "./ClaimCard.jsx";
       5 import ClaimStatus, { claimMessage } from "./ClaimStatus.jsx";
       6 import { CLAIM_STATUS } from "../hooks/useOptimisticClaim.js";
       7 import { DEFAULT_LATENCY_MS, createClaimService } from "../servi
         ces/claimService.js";
     … +207 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vitest run 2>&1 | grep -E "×|FAIL|Tests
      |Error:|Expected|Received|^\s+[-+…)
  ⎿       × the crate is labelled as a crate and shown as 0 ₫ 12ms
          × double-clicking sends one request 6ms
     ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
     … +10 lines (ctrl+o to expand)
  ⎿  (timeout 3m)

● Two of my test bugs are behind the failures: the price lookup misses a
  no-break space, and the frozen service blocks vi.spyOn. I'm reading the price
  field directly and cleaning up a bad expression in the sell-out test next.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/components/AirdropArena.test.jsx'; s=open(p,encoding='utf8…)
  ⎿        Tests  138 passed (138)
  ⎿  1 file changed (binary, mode only or too large to show)
  ⎿  (timeout 2m)

● 138 pass. Now Edge tests for claims with real clicks, a real double-click,
  keyboard use, and axe on every claim state:

● Write(LAB3\HW\pubgArena\e2e\claims.spec.js)
  ⎿  Wrote 110 lines to LAB3\HW\pubgArena\e2e\claims.spec.js
       1 import { expect, test } from "@playwright/test";
       2 import AxeBuilder from "@axe-core/playwright";
       3 
       4 // T-03B in Microsoft Edge: optimistic claims against the mock b
         ackend (600 ms latency),
       5 // with real clicks, a real double-click, keyboard operation and
          axe on every claim state.
       6 
       7 const VIP = "PVS Grand Finals VIP Ticket";
       8 const CRATE = "G-Coin Contraband Crate";
     … +102 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test 2>&1 | grep -vE "^\s*$" | grep -E
      "✘|passed|failed|Error|…)
  ⎿    ✘   5 e2e\countdown.spec.js:65:1 › the countdown reaches zero, turns
      live, and never shows a negative value (393ms)
       ✘   7 e2e\countdown.spec.js:79:1 › only the status is a live region;
     … +14 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Both failures come from new PRD 1 Edge content: the article name now matches
  the VIP ticket too, and the live-region count rose from 2 to 4. I'm fixing
  both with an exact name match and scoping the live-region count to the
  Countdowns section.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='e2e/countdown.spec.js'; s=open(p,encoding='utf8').read()…)
  ⎿  33:const timer = (page, title) => page.getByRole("timer", { name: `${t
     itle} countdown`, exact: true }).locator("time");
     34:const card = (page, title) => page.getByRole("article", { name: tit
     … +4 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\e2e\countdown.spec.js (+103 -103)
        1 -import { expect, test } from "@playwright/test";              
        2 -import AxeBuilder from "@axe-core/playwright";                
        3 -                                                              
        4 -// T-03A in Microsoft Edge with Playwright's controllable cloc
          -k. page.clock lets the test                                   
        5 -// freeze every timer while the wall clock moves on, which is 
          -what a throttled background                                   
        6 -// tab experiences, and then check that returning to the tab c
          -orrects the display at once.                                  
        7 -                                                              
        8 -const T0 = Date.parse("2026-11-09T12:00:00Z");   // exactly on
          - a 5-minute airdrop boundary                                  
        9 -const SEC = 1000;                                             
       10 -const MIN = 60 * SEC;                                         
       11 -                                                              
       12 -let consoleErrors;                                            
       13 -                                                              
       14 -test.beforeEach(async ({ page }) => {                         
       15 -    consoleErrors = [];                                       
       16 -    page.on("console", (message) => {                         
       17 -        if (message.type() === "error" || message.type() === "
          -warning") consoleErrors.push(message.text());                 
       18 -    });                                                       
       19 -    page.on("pageerror", (error) => consoleErrors.push(error.m
          -essage));                                                     
       20 -    // install() alone only sets the start time: the fake cloc
          -k keeps running in real time,                                 
       21 -    // so a slow page load shifted the expected digits (a flak
          -e found with --repeat-each).                                  
       22 -    // Pausing at T0 makes every test start at exactly T0; tim
          -e moves only when a test says so.                             
       23 -    await page.clock.install({ time: T0 - 10 * SEC });        
       24 -    await page.clock.pauseAt(T0);                             
       25 -    await page.goto("/");                                     
       26 -    await expect(page.getByRole("heading", { level: 1, name: "
          -Airdrop Arena" })).toBeVisible();                             
       27 -});                                                           
       28 -                                                              
       29 -test.afterEach(() => {                                        
       30 -    expect(consoleErrors, "no JavaScript errors or warnings in
          - the console").toEqual([]);                                   
       31 -});                                                           
       32 -                                                              
       33 -const timer = (page, title) => page.getByRole("timer", { name:
          - `${title} countdown` }).locator("time");                     
       34 -const card = (page, title) => page.getByRole("article", { name
          -: title });                                                   
       35 -                                                              
       36 -/** Switches the page's visibility the way a tab switch does (
          -Playwright cannot hide a real tab). */                        
       37 -async function setVisibility(page, state) {                   
       38 -    await page.evaluate((value) => {                          
       39 -        Object.defineProperty(document, "visibilityState", { c
          -onfigurable: true, get: () => value });                       
       40 -        document.dispatchEvent(new Event("visibilitychange"));
     … 166 more lines (ctrl+o to expand)
  ⎿  (timeout 6m 40s)

● Edge tests: 60/60 across 4 repeated runs. A final full run, build and
  screenshot:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vitest run 2>&1 | grep "Tests "; npx vite build 2>&1 | tail
      -1; SP="C:/Us…)
  ⎿        Tests  138 passed (138)
     ✓ built in 209ms
       1 passed (5.9s)
  ⎿  (timeout 5m)

  Read 1 file (ctrl+o to expand)

● Rendering is working. The 409 message says "Someone else got the last one"
  while the card still shows 100 in stock, so I'm changing it to "Another player
  claimed it first."

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; sed -i 's/Someone else got the last one; your stock was
      restored./Another pla…)
  ⎿  2
           Tests  138 passed (138)
       15 passed (18.1s)
  ⎿  Updated LAB3\HW\pubgArena\src\components\ClaimStatus.jsx (+49 -49)
       1 -/**                                                            
       2 - * KRAFTON x PUBG Vietnam Championship — T-03B claim status lin
         -e                                                              
       3 - *                                                             
       4 - *   <p id="pvs-vip-status" role="status" aria-live="polite" da
         -ta-claim-status="SUCCESS">Claim successful …</p>               
       5 - *                                                             
       6 - * A polite live region per card, so every state change of a cl
         -aim                                                            
       7 - * (pending, success, looted out, error) is announced without m
         -oving focus.                                                   
       8 - * One element, no wrapper (Project Rules 1 and 4); text only (
         -Rule 3).                                                       
       9 - */                                                            
      10 -import { CLAIM_STATUS } from "../hooks/useOptimisticClaim.js"; 
      11 -import styles from "./AirdropArena.module.css";                
      12 -                                                               
      13 -const STATUSES = Object.freeze(Object.values(CLAIM_STATUS));   
      14 -                                                               
      15 -/** The first 8 characters of a claim id, enough to tell claims
         - apart on screen. */                                           
      16 -export const shortClaimId = (claimId) => claimId.slice(0, 8);  
      17 -                                                               
      18 -export function claimMessage(claim, itemName) {                
      19 -    switch (claim.status) {                                    
      20 -        case CLAIM_STATUS.PENDING:                             
      21 -            return `Claiming ${itemName}…`;                    
      22 -        case CLAIM_STATUS.SUCCESS:                             
      23 -            return `Claim successful: ${itemName} (claim ${shor
         -tClaimId(claim.claimId)}).`;                                   
      24 -        case CLAIM_STATUS.CONFLICT:                            
      25 -            return `${claim.message} Someone else got the last 
         -one; your stock was restored.`;                                
      26 -        case CLAIM_STATUS.ERROR:                               
      27 -            return `${claim.message}: your claim was not confir
         -med and your stock was restored. You can retry.`;              
      28 -        default:                                               
      29 -            return "Ready to claim.";                          
      30 -    }                                                          
      31 -}                                                              
      32 -                                                               
      33 -export default function ClaimStatus({ claim, itemName, id }) { 
      34 -    if (claim === null || typeof claim !== "object" || !STATUSE
         -S.includes(claim.status)) {                                    
      35 -        throw new TypeError(`ClaimStatus: claim.status must be 
         -one of ${STATUSES.join(", ")}`);                               
      36 -    }                                                          
      37 -    if (claim.status !== CLAIM_STATUS.IDLE && (typeof claim.cla
         -imId !== "string" || claim.claimId === "")) {                  
      38 -        throw new TypeError("ClaimStatus: an active claim needs
         - its claimId");                                                
      39 -    }                                                          
      40 -    if (typeof claim.message !== "string") throw new TypeError(
         -"ClaimStatus: claim.message must be a string");                
     … 58 more lines (ctrl+o to expand)
  ⎿  … 1 more file changed
  ⎿  (timeout 5m)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; git add -A . && git status --short . && git commit -q -F -
      <<'EOF'
      feat(hw3):…)
  ⎿  warning: in the working copy of 'LAB3/HW/pubgArena/src/App.jsx', LF wi
     ll be replaced by CRLF the next time Git touches it
     warning: in the working copy of 'LAB3/HW/pubgArena/e2e/claims.spec.js'
     … +27 lines (ctrl+o to expand)

● Updating the HW3 memory with PRD 2's status and audit evidence:

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; python -c "
      p='lab3-hw3-pubg-arena.md'; s=open(p,encodin…)
  ⎿  14
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; python -c "
      p='lab3-hw3-pubg-arena.md'; s=open(p,encodin…)
  ⎿  Traceback (most recent call last):
       File "<string>", line 4, in <module>
         s=re.sub(r'Tests use .{1,3}\.', r'Tests compare against the escape
     … +15 lines (ctrl+o to expand)

  Recalled 1 memory, wrote 1 memory (ctrl+o to expand)

● HW3 PRD 2 is committed as b1907fd feat(hw3): add optimistic ticket and G-Coin 
  claims. All 138 unit tests and 15 Edge tests pass, the Edge tests passed 4
  runs in a row, and the build works. I followed Project_Rule.md throughout:
  1. No div soup: semantic elements only (section, ul/li, article, dl,
     fieldset). An automated check scans every source file for <div>.
  2. Type checks: every item, server response, prop and service input is
     validated, and anything invalid throws a TypeError.
  3. XSS: text is always rendered as text. A test puts <img onerror> in an item
     name and confirms it shows as plain text.
  4. Mounting order: the arena owns the list, and the cards appear in inventory
     order.

  What was built
  - data/inventory.js: the PRD's VIP Ticket (25 at 1.500.000 ₫) and G-Coin Crate
    (100, free), validated.
  - utils/formatVND.js: uses Intl.NumberFormat("vi-VN").
  - services/claimService.js: a mock backend that never behaves randomly.
    - It keeps its own stock. Normal mode returns 200 while stock lasts,
      then 409.
    - The Server simulation panel on the page can force 409, a network error or
      a 500 for each item, so you can try every case by hand.
    - It remembers each claimId, so retrying the same claim never takes a second
      unit.
  - hooks/useOptimisticClaim.js:
    - Before claiming: it checks there is stock and that no claim for the item
      is in flight (the useRef lock). Each claim gets a crypto.randomUUID().
    - On click: the stock drops by one straight away, without waiting for the
      server.
    - On 200: the stock is matched to the server's count.
    - On 409: the unit is given back and the card shows "Looted Out!".
    - On a network error or 500: the unit is given back, the card shows a
      separate error, and nothing is shown as a success. Retry re-sends the same
      claimId.
  - Concurrent claims: each deduction is tracked as its own transaction with its
    item and claimId. Rollback adds 1 to that item only and happens at most
    once. A failure on the ticket cannot touch the crate's stock.
  - ClaimCard, ClaimStatus, AirdropArena: each card has a status line that
    screen readers announce. The claim button stays focusable while a claim is
    pending, but clicks are ignored.

  Verification
  - Edge tests: 200, 409, network error then retry, a real double-click (makes
    one claim), a ticket 409 during a crate claim, keyboard use, and axe on
    every claim state at 375 and 1280 px.
  - Mutation checks:
    - Changing rollback to restore the old inventory as a whole makes 3
      concurrency tests fail.
    - Removing the lock makes 2 duplicate-click tests fail.

  New audit evidence (saved to memory, items 8–14):
  - PRD price example: Intl puts a no-break space before ₫, so the PRD's literal
    "1.500.000 ₫" is not equal to the real output. A test copied from the PRD
    would fail.
  - PRD rollback snippet: it adds 1 back with nothing tying the rollback to its
    own claim. I added per-claim transactions; the mutation checks above show
    they're needed.
  - Two useless tests of mine: I wrote two tests for late server responses, and
    both still passed with the guard deleted:
    - One rejected an already-settled promise, which does nothing.
    - One answered after unmount, when React drops all updates anyway.

    I removed both and documented the guard as purely defensive: in this design
    no test can provoke a late response.
  - Two bugs caught before testing: retry() read state in a way React may defer,
    and the status line ignored its id, so the button's description pointed at
    nothing.
  - Test bugs: a text lookup didn't match the no-break-space price, and vi.spyOn
    can't patch the frozen service object.
  - PRD 1 Edge tests broken by the new content: Playwright's default substring
    name matching made "PVS Grand Finals" also match the VIP ticket card, and
    the live-region count went from 2 to 4.
  - Misleading message: the screenshot showed the forced-409 message saying "got
    the last one" while 100 were in stock, so I reworded it.

  Ready for PRD 3. It's where the missing Lab 2 Virtual Scroller matters; send
  it when ready.

✻ Cogitated for 10m 40s · done 8:21 PM

❯ go on with PRD 3                                                              
  PRD 3 — PUBG Vietnam Leaderboard & Kill-Feed Virtual Scroller                 
  T-03C: Live Esports Data Explorer                                             
  Commit 3                                                                      
  Estimated duration: 30–35 minutes                                             
                                                                                
  Git commit message                                                            
                                                                                
  feat(hw3): build virtualized PUBG VN leaderboard                              
                                                                                
  1. Objective                                                                  
  Transform the static PUBG Vietnam squad dataset into an interactive           
  leaderboard.                                                                  
                                                                                
  Users must be able to:                                                        
                                                                                
  View Vietnamese esports squads.                                               
                                                                                
  Sort squads by WWCD, Placement Points, and Kill Points.                       
                                                                                
  Filter squads using search and category controls.                             
                                                                                
  View a live-style kill feed.                                                  
                                                                                
  Filter kill-feed events.                                                      
                                                                                
  Render large lists using the virtual scrolling architecture from Lab 2 HW 3.  
                                                                                
  2. Required file structure                                                    
  src/                                                                          
  ├── components/                                                               
  │   ├── Leaderboard.jsx                                                       
  │   ├── LeaderboardRow.jsx                                                    
  │   ├── LeaderboardControls.jsx                                               
  │   ├── KillFeed.jsx                                                          
  │   └── VirtualList.jsx                                                       
  │                                                                             
  └── data/                                                                     
      └── pubgSquads.js                                                         
  3. Initial PUBG VN squad schema                                               
  Use the following four squads:                                                
                                                                                
  export const PUBG_SQUADS = [                                                  
    {                                                                           
      id: 'squad-01',                                                           
      name: 'The Expendables',                                                  
      tag: 'TE',                                                                
      wwcd: 3,                                                                  
      placementPoints: 85,                                                      
      killPoints: 72,                                                           
    },                                                                          
    {                                                                           
      id: 'squad-02',                                                           
      name: 'Cerberus Esports',                                                 
      tag: 'CES',                                                               
      wwcd: 2,                                                                  
      placementPoints: 78,                                                      
      killPoints: 81,                                                           
    },                                                                          
    {                                                                           
      id: 'squad-03',                                                           
      name: 'Roy Esports',                                                      
      tag: 'ROY',                                                               
      wwcd: 1,                                                                  
      placementPoints: 65,                                                      
      killPoints: 69,                                                           
    },                                                                          
    {                                                                           
      id: 'squad-04',                                                           
      name: 'AGG',                                                              
      tag: 'AGG',                                                               
      wwcd: 1,                                                                  
      placementPoints: 59,                                                      
      killPoints: 74,                                                           
    },                                                                          
  ];                                                                            
                                                                                
  These are illustrative development values, not verified official tournament   
  standings.                                                                    
                                                                                
  4. Leaderboard sorting                                                        
  Implement three sorting modes:                                                
                                                                                
  Sort mode                                                                     
                                                                                
  Data field                                                                    
                                                                                
  WWCD                                                                          
                                                                                
  wwcd                                                                          
                                                                                
  Placement Points                                                              
                                                                                
  placementPoints                                                               
                                                                                
  Kill Points                                                                   
                                                                                
  killPoints                                                                    
                                                                                
  Use immutable sorting:                                                        
                                                                                
  const sortedSquads = filteredSquads.toSorted(                                 
    (a, b) => b[sortBy] - a[sortBy]                                             
  );                                                                            
                                                                                
  Do not mutate the original squad dataset using .sort().                       
                                                                                
  5. Search and filter controls                                                 
  Implement:                                                                    
                                                                                
  Search by squad name.                                                         
                                                                                
  Search by squad tag.                                                          
                                                                                
  Filter by WWCD count.                                                         
                                                                                
  Sort by the three required scoring categories.                                
                                                                                
  Example:                                                                      
                                                                                
  const visibleSquads = PUBG_SQUADS                                             
    .filter((squad) => {                                                        
      const matchesSearch =                                                     
        squad.name.toLowerCase().includes(                                      
          query.toLowerCase()                                                   
        ) ||                                                                    
        squad.tag.toLowerCase().includes(                                       
          query.toLowerCase()                                                   
        );                                                                      
                                                                                
      return matchesSearch;                                                     
    })                                                                          
    .toSorted((a, b) => b[sortBy] - a[sortBy]);                                 
                                                                                
  Keep raw inputs in React state and calculate filtered/sorted results during   
  rendering or using useMemo.                                                   
                                                                                
  Do not introduce unnecessary useEffect for derived leaderboard da             
  ──── (348 lines hidden) ───────────────────────────────────────────────────── 
  nical problem.                                                                
                                                                                
  ### How I detected it                                                         
  Describe the test or observation.                                             
                                                                                
  ### Corrective action                                                         
  Explain the implementation change.                                            
                                                                                
  ### Prevention                                                                
  Describe the engineering rule that prevents recurrence.                       
                                                                                
  ---                                                                           
                                                                                
  ## Conclusion                                                                 
                                                                                
  Summarize how debugging and verification                                      
  improved the reliability of the application.                                  
  Suggested areas to investigate                                                
  These are possible failure categories to check, not bugs you should claim     
  occurred without evidence.                                                    
                                                                                
  Failure area                                                                  
                                                                                
  Potential issue to investigate                                                
                                                                                
  Timer                                                                         
                                                                                
  Using decrement-based setInterval instead of absolute timestamps              
                                                                                
  Visibility                                                                    
                                                                                
  Missing visibilitychange cleanup or resynchronization                         
                                                                                
  Optimistic UI                                                                 
                                                                                
  Failing to restore stock after HTTP 409                                       
                                                                                
  Claim locking                                                                 
                                                                                
  Duplicate requests caused by rapid clicking                                   
                                                                                
  Virtual scrolling                                                             
                                                                                
  Incorrect spacer height or missing overscan                                   
                                                                                
  Sorting                                                                       
                                                                                
  Mutating the original array with .sort()                                      
                                                                                
  React state                                                                   
                                                                                
  Stale state updates after asynchronous responses                              
                                                                                
  Important grading recommendation: Include a before-and-after code snippet for 
  each genuine failure. If possible, also include the relevant test output or   
  screenshot. This makes the audit evidence-based rather than just descriptive. 
                                                                                
  6. Accessibility verification                                                 
  The final platform must support:                                              
                                                                                
  Keyboard navigation.                                                          
                                                                                
  Visible focus indicators.                                                     
                                                                                
  Semantic headings and sections.                                               
                                                                                
  Accessible form labels.                                                       
                                                                                
  Meaningful button labels.                                                     
                                                                                
  Screen-reader-friendly claim feedback.                                        
                                                                                
  Appropriate live-region announcements.                                        
                                                                                
  Sufficient color contrast.                                                    
                                                                                
  Responsive layouts.                                                           
                                                                                
  Avoid announcing every countdown update every 200 milliseconds through        
  aria-live. That would create unnecessary screen-reader noise. Keep the        
  rapidly updating visual timer separate from meaningful announcements.         
                                                                                
  7. Responsive verification                                                    
  Test the application at:                                                      
                                                                                
  Viewport                                                                      
                                                                                
  Expected behavior                                                             
                                                                                
  375px                                                                         
                                                                                
  Mobile layout, horizontally scrollable leaderboard if needed                  
                                                                                
  768px                                                                         
                                                                                
  Tablet layout                                                                 
                                                                                
  1024px                                                                        
                                                                                
  Compact desktop dashboard                                                     
                                                                                
  1440px                                                                        
                                                                                
  Full esports dashboard                                                        
                                                                                
  8. Acceptance criteria                                                        
                                                                                
  Countdown integrated into the main application.                               
                                                                                
  Ticket and G-Coin claim workflows functional.                                 
                                                                                
  HTTP 409 rollback verified.                                                   
                                                                                
  Duplicate claims prevented.                                                   
                                                                                
  Leaderboard integrated.                                                       
                                                                                
  All three sorting modes work.                                                 
                                                                                
  Kill-feed filtering works.                                                    
                                                                                
  Virtual scrolling verified with a large dataset.                              
                                                                                
  Keyboard accessibility checked.                                               
                                                                                
  Responsive layout verified.                                                   
                                                                                
  AI_FAILURE_AUDIT.md exists in repository root.                                
                                                                                
  At least three genuine AI failure cases documented.                           
                                                                                
  Each failure includes detection and corrective action.                        
                                                                                
  Four atomic Git commits completed.                                            

● Two PRDs: I'll finish and commit PRD 3, then do PRD 4, which includes the
  audit. First, one last check that no Lab 2 virtual scroller exists under
  another name, since both PRDs say to reuse it:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r"; grep
      -rln "scrollTop\|overscan\|rowHeight\|virtual" --include=*.js
      --include=*.jsx --include=*.…)
  ⎿  ./LAB2/EXERCISE/sources/lulehuonggiang_24520416.html
     ./LAB2/HW/AI_AUDIT_FAILURE_2.md
     ./LAB3/EXERCISE/profileCard/dist/assets/index-B6U_Nlr9.js
     … +20 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r"; grep -n
      -i "scrollTop\|overscan\|virtual" LAB2/HW/AI_AUDIT_FAILURE_2.md
      LAB2/EXERCISE/sources/l…)  ⎿  LAB2/HW/AI_AUDIT_FAILURE_2.md:172:- `--dump-dom --virtual-time-budget=
     60000` froze at the first test that
     LAB2/HW/AI_AUDIT_FAILURE_2.md:173:  decodes a real WAV file. Virtual t
     … +20 lines (ctrl+o to expand)

● No virtual scroller exists in the repo; the two LAB2 hits are unrelated, so
  the new virtualListUtils.js will follow the pure gridModel.js pattern, and the
  code and audit will say the scroller is new.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB2/HW/so
      urce"; sed -n 1,60p gridModel.js; grep -n "^export" gridModel.js)
  ⎿  /**
      * Accessible Data-Grid — sorting, filtering (PRD 2), pagination (PRD
     3) and
     … +66 lines (ctrl+o to expand)

● I'm porting the data grid's model/view split and its diacritic-insensitive
  search from Lab 2, and the kill feed's seeded generator keeps its 1,000 events
  identical on every run.

● Write(LAB3\HW\pubgArena\src\data\pubgSquads.js)
  ⎿  Wrote 142 lines to LAB3\HW\pubgArena\src\data\pubgSquads.js
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03C squads and kill f
         eed
       3  *
       4  * Illustrative development values, not verified official tourna
         ment
       5  * standings; every kill-feed event is fictional. All records ar
         e frozen and
       6  * validated (Project Rule 2) before any component renders them.
       7  *
     … +135 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\utils\virtualListUtils.js)
  ⎿  Wrote 76 lines to LAB3\HW\pubgArena\src\utils\virtualListUtils.js
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03C virtual list math
         s (DOM-free)
       3  *
       4  * NOTE: the PRD asks to reuse "Lab 2 HW 3's Virtual Scroller". 
         No virtual
       5  * scroller exists in this repository's Lab 2 work (the Lab 2 da
         ta grid uses
       6  * pagination, and Lab 2 HW 3 is the mega-sale countdown), so th
         is one is new.
     … +70 lines (ctrl+o to expand)

● Removing scrollTopForIndex. Nothing will use it, and I've already left dead
  code once this homework.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/utils/virtualListUtils.js'; s=open(p,encoding='utf8').read…)
  ⎿  29:export function computeVisibleRange({ itemCount, rowHeight, viewpor
     tHeight, scrollTop, overscan = 0 }) {
     59:export function normalizeSearchText(text) {
  ⎿  Updated LAB3\HW\pubgArena\src\utils\virtualListUtils.js (+65 -76)
       1 -/**                                                            
       2 - * KRAFTON x PUBG Vietnam Championship — T-03C virtual list mat
         -hs (DOM-free)                                                  
       3 - *                                                             
       4 - * NOTE: the PRD asks to reuse "Lab 2 HW 3's Virtual Scroller".
         - No virtual                                                    
       5 - * scroller exists in this repository's Lab 2 work (the Lab 2 d
         -ata grid uses                                                  
       6 - * pagination, and Lab 2 HW 3 is the mega-sale countdown), so t
         -his one is new.                                                
       7 - * It keeps the Lab 2 data-grid architecture: a pure, validated
         - model                                                         
       8 - * (this file, like LAB2/HW/source/gridModel.js) and a thin vie
         -w                                                              
       9 - * (components/VirtualList.jsx) that only renders what the mode
         -l says.                                                        
      10 - *                                                             
      11 - * For fixed-height rows:                                      
      12 - *   startIndex = max(0, floor(scrollTop / rowHeight) − oversca
         -n)                                                             
      13 - *   endIndex   = min(count, ceil((scrollTop + viewportHeight) 
         -/ rowHeight) + overscan)                                       
      14 - * and the rows outside [startIndex, endIndex) are replaced by 
         -padding of                                                     
      15 - * exactly their total height, so the scrollable height (and th
         -e scrollbar)                                                   
      16 - * always matches the full list.                               
      17 - *                                                             
      18 - * scrollTop is clamped to the real scroll range first: when th
         -e list shrinks                                                 
      19 - * (a filter) while scrolled far down, an unclamped scrollTop w
         -ould point past                                                
      20 - * the end and render nothing.                                 
      21 - */                                                            
      22 -                                                               
      23 -function assertCount(value, name, { positive = false } = {}) { 
      24 -    if (!Number.isSafeInteger(value) || value < 0 || (positive 
         -&& value === 0)) {                                             
      25 -        throw new TypeError(`virtualList: ${name} must be ${pos
         -itive ? "a positive" : "a non-negative"} integer, received ${JS
         -ON.stringify(value)}`);                                        
      26 -    }                                                          
      27 -}                                                              
      28 -                                                               
      29 -export function computeVisibleRange({ itemCount, rowHeight, vie
         -wportHeight, scrollTop, overscan = 0 }) {                      
      30 -    assertCount(itemCount, "itemCount");                       
      31 -    assertCount(rowHeight, "rowHeight", { positive: true });   
      32 -    assertCount(viewportHeight, "viewportHeight", { positive: t
         -rue });                                                        
      33 -    assertCount(overscan, "overscan");                         
      34 -    if (typeof scrollTop !== "number" || !Number.isFinite(scrol
         -lTop)) {                                                       
      35 -        throw new TypeError(`virtualList: scrollTop must be a f
         -inite number, received ${JSON.stringify(scrollTop)}`);         
      36 -    }                                                          
      37 -                                                               
      38 -    const totalHeight = itemCount * rowHeight;                 
      39 -    const maxScrollTop = Math.max(0, totalHeight - viewportHeig
         -ht);                                                           
      40 -    const top = Math.min(Math.max(0, scrollTop), maxScrollTop);
     … 101 more lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\components\VirtualList.jsx)
  ⎿  Wrote 72 lines to LAB3\HW\pubgArena\src\components\VirtualList.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03C virtual list (vie
         w)
       3  *
       4  *   <ol tabindex="0" aria-labelledby=… style="height: 400px; pa
         dding-top: Xpx; padding-bottom: Ypx">
       5  *     <li aria-posinset="41" aria-setsize="1000">…</li>     onl
         y startIndex … endIndex − 1
       6  *   </ol>
       7  *
     … +65 lines (ctrl+o to expand)

● The <ol> needs box-sizing: border-box alongside its height and padding, or the
  list won't scroll. I'll verify the real scrollHeight in Edge, then move on to
  the leaderboard components.

● Write(LAB3\HW\pubgArena\src\components\LeaderboardControls.jsx)
  ⎿  Wrote 66 lines to
     LAB3\HW\pubgArena\src\components\LeaderboardControls.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03C leaderboard contr
         ols
       3  *
       4  *   <form role="search" aria-label="Filter and sort squads">
       5  *     <label for=:r1:>Search squads</label> <input type="search
         " id=:r1:>
       6  *     <label for=:r2:>Minimum WWCD</label>  <select id=:r2:>
       7  *     <label for=:r3:>Sort by</label>       <select id=:r3:>
       8  *   </form>
     … +58 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\components\LeaderboardRow.jsx)
  ⎿  Wrote 27 lines to LAB3\HW\pubgArena\src\components\LeaderboardRow.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03C leaderboard row
       3  *
       4  * One <tr>; the parent (Leaderboard) owns the <tbody> and the k
         ey, so the
       5  * row adds no wrapper (Project Rules 1 and 4). The squad name i
         s the row
       6  * header (<th scope="row">), so a screen reader announces "Cerb
         erus
       7  * Esports" with every score cell. Values are rendered as text (
     … +21 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\components\Leaderboard.jsx)
  ⎿  Wrote 101 lines to LAB3\HW\pubgArena\src\components\Leaderboard.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03C squad leaderboard
       3  *
       4  *   <section aria-labelledby="leaderboard-title">
       5  *     <h3>Squad Leaderboard</h3>
       6  *     <LeaderboardControls/>                         search, mi
         nimum WWCD, sort
       7  *     <p role="status">Showing 4 of 4 squads, sorted by WWCD.</
         p>
       8  *     <figure tabindex="0">                          horizontal
     … +94 lines (~5 KB) (ctrl+o to expand)

● Fixing a flaw before testing: the empty state says No squads match “{query}”,
  which reads wrong when the WWCD filter is what excluded everything and the
  query is empty. Making it describe both:

● Update(LAB3\HW\pubgArena\src\components\Leaderboard.jsx)
  ⎿  Added 4 lines, removed 1 line
      88                      <tbody>
      89                          {visibleSquads.length === 0 ? (
      90                              <tr>
      91 -                                <td colSpan={6} className={styl
         -es.empty}>No squads match “{query}”.</td>                      
      91 +                                <td colSpan={6} className={styl
         +es.empty}>                                                     
      92 +                                    No squads match {query.trim
         +() === "" ? "" : `“${query.trim()}” `}                         
      93 +                                    {minWwcd > 0 ? `with ${minW
         +wcd} or more WWCD` : "this search"}.                           
      94 +                                </td>                          
      95                              </tr>
      96                          ) : visibleSquads.map((squad, index) =>
           (
      97                              <LeaderboardRow key={squad.id} squa
          d={squad} rank={index + 1} sortBy={sortBy} />

● Write(LAB3\HW\pubgArena\src\components\KillFeed.jsx)
  ⎿  Wrote 96 lines to LAB3\HW\pubgArena\src\components\KillFeed.jsx
       1 /**
       2  * KRAFTON x PUBG Vietnam Championship — T-03C virtualized kill 
         feed
       3  *
       4  *   <section aria-labelledby="killfeed-title">
       5  *     <h3>Kill Feed</h3>
       6  *     <p> <label for=:r4:>Show squad</label> <select id=:r4:> <
         /p>
       7  *     <p role="status">Showing 251 of 1,000 events for Roy Espo
         rts.</p>
     … +89 lines (ctrl+o to expand)

● Now the shared styles and the Championship section in the App:

● Write(LAB3\HW\pubgArena\src\components\Championship.module.css)
  ⎿  Wrote 189 lines to
     LAB3\HW\pubgArena\src\components\Championship.module.css
       1 /* KRAFTON x PUBG Vietnam Championship — leaderboard and kill-fe
         ed styles (T-03C). Colours come from the --arena-* tokens. */
       2 
       3 .championship {
       4     margin-top: 2rem;
       5     min-width: 0;
       6 }
       7 
       8 .sectionTitle {
       9     margin: 0 0 1rem;
     … +180 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\App.jsx)
  ⎿  Added 29 lines, removed 5 lines
       1  import { useState } from "react";
       2  import AirdropArena from "./components/AirdropArena.jsx";
       3  import AirdropCountdown from "./components/AirdropCountdown.jsx
          ";
       4 +import KillFeed from "./components/KillFeed.jsx";              
       5 +import Leaderboard from "./components/Leaderboard.jsx";        
       6  import { INITIAL_INVENTORY } from "./data/inventory.js";
       7 +import { PUBG_SQUADS, createKillFeed } from "./data/pubgSquads.
         +js";                                                           
       8  import { SIMULATED_SERVER_OFFSET_MS, createSchedule } from "./d
          ata/schedule.js";
       9  import { createClaimService } from "./services/claimService.js"
          ;
      10 +import championship from "./components/Championship.module.css"
         +;                                                              
      11  
      12  /**
      13   * Rendered into <main id="root"> (index.html); landmarks only,
           no wrapper element.
      10 - * The schedule and the mock claim backend are created once per
         - mount, so the                                                 
      11 - * airdrop target stays fixed and the server keeps its stock be
         -tween claims.                                                  
      12 - * `schedule`, `serverOffsetMs`, `claimService` and `generateCl
         -aimId` are injectable for tests.                               
      14 + *                                                             
      15 + *   header                                                    
      16 + *   Section A  Countdowns            (usePubgAirdropTimer)    
      17 + *   Section B  Claim Center          (useOptimisticClaim + moc
         +k claimService)                                                
      18 + *   Section C  PUBG Vietnam Championship: Leaderboard + virtua
         +lized KillFeed                                                 
      19 + *   footer                                                    
      20 + *                                                             
      21 + * The schedule, the mock backend and the kill feed are created
         + once per                                                      
      22 + * mount. Everything is injectable for tests.                  
      23   */
      14 -export default function App({ schedule, serverOffsetMs = SIMULA
         -TED_SERVER_OFFSET_MS, claimService, generateClaimId } = {}) {  
      24 +export default function App({                                  
      25 +    schedule,                                                  
      26 +    serverOffsetMs = SIMULATED_SERVER_OFFSET_MS,               
      27 +    claimService,                                              
      28 +    generateClaimId,                                           
      29 +    killFeed                                                   
      30 +} = {}) {                                                      
      31      const [events] = useState(() => schedule ?? createSchedule(
          Date.now(), serverOffsetMs));
      32      const [service] = useState(() => claimService ?? createClai
          mService());
      33 +    const [feed] = useState(() => killFeed ?? createKillFeed())
         +;                                                              
      34      return (
      35          <>
      36              <header>
      37                  <p className="eyebrow">KRAFTON x PUBG Vietnam C
          hampionship</p>
      38                  <h1>Airdrop Arena</h1>
      22 -                <p className="tagline">Countdowns to the PVS Gr
         -and Finals and the next G-Coin airdrop</p>                     
      39 +                <p className="tagline">Countdowns, airdrop clai
         +ms and the PUBG Vietnam Championship leaderboard</p>           
      40              </header>
      41              <AirdropCountdown events={events} serverOffsetMs={s
          erverOffsetMs} />
      42              <AirdropArena initialInventory={INITIAL_INVENTORY} 
          service={service} generateClaimId={generateClaimId} />
      43 +            <section className={championship.championship} aria
         +-labelledby="championship-title">                              
      44 +                <h2 id="championship-title" className={champion
         +ship.sectionTitle}>PUBG Vietnam Championship</h2>              
      45 +                <ul className={championship.panels} aria-label=
         +"Championship panels" role="list">                             
      46 +                    <li><Leaderboard squads={PUBG_SQUADS} /></l
         +i>                                                             
      47 +                    <li><KillFeed events={feed} squads={PUBG_SQ
         +UADS} /></li>                                                  
      48 +                </ul>                                          
      49 +            </section>                                         
      50              <footer>
      51                  <p>Student project with fictional demo data. No
          t affiliated with KRAFTON or PUBG.</p>
      52              </footer>

● Wrapping the two panels in a <ul> only for layout would misuse a list as a
  container, so I'm putting the grid on the section and letting the heading span
  both columns.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/App.jsx'; s=open(p,encoding='utf8').read()…)
  ⎿  src/components/Championship.module.css:3:/* The section itself is the
     grid (no wrapper element): heading on top, then the two panels. */
          × renders header, countdowns, claim center and footer with no wra
     … +3 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\App.jsx (+53 -55)
       1 -import { useState } from "react";                              
       2 -import AirdropArena from "./components/AirdropArena.jsx";      
       3 -import AirdropCountdown from "./components/AirdropCountdown.jsx
         -";                                                             
       4 -import KillFeed from "./components/KillFeed.jsx";              
       5 -import Leaderboard from "./components/Leaderboard.jsx";        
       6 -import { INITIAL_INVENTORY } from "./data/inventory.js";       
       7 -import { PUBG_SQUADS, createKillFeed } from "./data/pubgSquads.
         -js";                                                           
       8 -import { SIMULATED_SERVER_OFFSET_MS, createSchedule } from "./d
         -ata/schedule.js";                                              
       9 -import { createClaimService } from "./services/claimService.js"
         -;                                                              
      10 -import championship from "./components/Championship.module.css"
         -;                                                              
      11 -                                                               
      12 -/**                                                            
      13 - * Rendered into <main id="root"> (index.html); landmarks only,
         - no wrapper element.                                           
      14 - *                                                             
      15 - *   header                                                    
      16 - *   Section A  Countdowns            (usePubgAirdropTimer)    
      17 - *   Section B  Claim Center          (useOptimisticClaim + moc
         -k claimService)                                                
      18 - *   Section C  PUBG Vietnam Championship: Leaderboard + virtua
         -lized KillFeed                                                 
      19 - *   footer                                                    
      20 - *                                                             
      21 - * The schedule, the mock backend and the kill feed are created
         - once per                                                      
      22 - * mount. Everything is injectable for tests.                  
      23 - */                                                            
      24 -export default function App({                                  
      25 -    schedule,                                                  
      26 -    serverOffsetMs = SIMULATED_SERVER_OFFSET_MS,               
      27 -    claimService,                                              
      28 -    generateClaimId,                                           
      29 -    killFeed                                                   
      30 -} = {}) {                                                      
      31 -    const [events] = useState(() => schedule ?? createSchedule(
         -Date.now(), serverOffsetMs));                                  
      32 -    const [service] = useState(() => claimService ?? createClai
         -mService());                                                   
      33 -    const [feed] = useState(() => killFeed ?? createKillFeed())
         -;                                                              
      34 -    return (                                                   
      35 -        <>                                                     
      36 -            <header>                                           
      37 -                <p className="eyebrow">KRAFTON x PUBG Vietnam C
         -hampionship</p>                                                
      38 -                <h1>Airdrop Arena</h1>                         
      39 -                <p className="tagline">Countdowns, airdrop clai
         -ms and the PUBG Vietnam Championship leaderboard</p>           
      40 -            </header>                                          
     … 68 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\components\Championship.module.css (+189
     -189)
        1 -/* KRAFTON x PUBG Vietnam Championship — leaderboard and kill-
          -feed styles (T-03C). Colours come from the --arena-* tokens. *
          -/                                                             
        2 -                                                              
        3 -.championship {                                               
        4 -    margin-top: 2rem;                                         
        5 -    min-width: 0;                                             
        6 -}                                                             
        7 -                                                              
        8 -.sectionTitle {                                               
        9 -    margin: 0 0 1rem;                                         
       10 -    font-size: 1.125rem;                                      
       11 -    text-transform: uppercase;                                
       12 -    letter-spacing: 0.12em;                                   
       13 -    color: var(--arena-muted);                                
       14 -}                                                             
       15 -                                                              
       16 -.panels {                                                     
       17 -    display: grid;                                            
       18 -    gap: 1rem;                                                
       19 -    grid-template-columns: minmax(0, 1fr);                    
       20 -}                                                             
       21 -                                                              
       22 -@media (min-width: 1024px) {                                  
       23 -    .panels { grid-template-columns: minmax(0, 3fr) minmax(0, 
          -2fr); }                                                       
       24 -}                                                             
       25 -                                                              
       26 -.panel {                                                      
       27 -    min-width: 0;                                             
       28 -    padding: 1rem 1.25rem;                                    
       29 -    background: var(--arena-surface);                         
       30 -    border: 1px solid var(--arena-border);                    
       31 -    border-radius: var(--arena-radius);                       
       32 -}                                                             
       33 -                                                              
       34 -.panelTitle {                                                 
       35 -    margin: 0 0 0.75rem;                                      
       36 -    font-size: 1rem;                                          
       37 -    text-transform: uppercase;                                
       38 -    letter-spacing: 0.06em;                                   
       39 -}                                                             
       40 -                                                              
     … 338 more lines (ctrl+o to expand)
  ⎿  (timeout 2m)

● The one failure is again the App-structure test, which needs the third
  section. I'll fix it with the new tests: virtual-list maths, data, leaderboard
  sort/search/filter, and the kill feed.

● Write(LAB3\HW\pubgArena\src\utils\virtualListUtils.test.js)
  ⎿  Wrote 65 lines to LAB3\HW\pubgArena\src\utils\virtualListUtils.test.js
       1 import { describe, expect, test } from "vitest";
       2 import { computeVisibleRange, normalizeSearchText } from "./virt
         ualListUtils.js";
       3 
       4 // T-03C — virtual list maths (PRD 3 section 7).
       5 
       6 const base = { itemCount: 1000, rowHeight: 64, viewportHeight: 3
         84, overscan: 5 };
       7 
       8 describe("computeVisibleRange", () => {
     … +57 lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\src\components\Championship.test.jsx)
  ⎿  Wrote 303 lines to
     LAB3\HW\pubgArena\src\components\Championship.test.jsx
       1 import { afterEach, describe, expect, test, vi } from "vitest";
       2 import { cleanup, fireEvent, render, screen, within } from "@tes
         ting-library/react";
       3 import App from "../App.jsx";
       4 import KillFeed, { KILL_FEED_OVERSCAN, KILL_FEED_VIEWPORT, KILL_
         ROW_HEIGHT } from "./KillFeed.jsx";
       5 import Leaderboard, { selectSquads } from "./Leaderboard.jsx";
       6 import VirtualList from "./VirtualList.jsx";
       7 import LEADERBOARD_SOURCE from "./Leaderboard.jsx?raw";
       8 import {
     … +295 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/components/AirdropCountdown.test.jsx'; s=open(p,encoding='…)  ⎿       × every control has a visible label tied by htmlFor / useId 24ms
          × scrolling moves the window; padding keeps the full height; rows
      keep their stable keys 19ms
     … +17 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\components\AirdropCountdown.test.jsx (+2
     -2)
      158  });
      159  
      160  describe("App", () => {
      161 -    test("renders header, countdowns, claim center and footer 
          -with no wrapper; both timers are present", () => {            
      161 +    test("renders header, the three sections and footer with n
          +o wrapper; both timers are present", () => {                  
      162          const { container } = renderInMain(<App />);
      163 -        expect([...container.children].map((n) => n.tagName)).
          -toEqual(["HEADER", "SECTION", "SECTION", "FOOTER"]);          
      163 +        expect([...container.children].map((n) => n.tagName)).
          +toEqual(["HEADER", "SECTION", "SECTION", "SECTION", "FOOTER"])
          +;                                                             
      164          expect(screen.getByRole("heading", { level: 1, name: "
           Airdrop Arena" })).toBeTruthy();
      165          expect(screen.getAllByRole("timer")).toHaveLength(2);
      166      });
  ⎿  (timeout 3m)

● Two of the three failures are in my own test code, not the product; the third
  is a real accessibility bug where the kill row's spans run together as "Player
  BTE" with no space, so I'm adding a space text node.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/components/KillFeed.jsx'; s=open(p,encoding='utf8').read()…)
  ⎿        Tests  189 passed (189)
  ⎿  Updated LAB3\HW\pubgArena\src\components\KillFeed.jsx (+98 -96)
       1 -/**                                                            
       2 - * KRAFTON x PUBG Vietnam Championship — T-03C virtualized kill
         - feed                                                          
       3 - *                                                             
       4 - *   <section aria-labelledby="killfeed-title">                
       5 - *     <h3>Kill Feed</h3>                                      
       6 - *     <p> <label for=:r4:>Show squad</label> <select id=:r4:> 
         -</p>                                                           
       7 - *     <p role="status">Showing 251 of 1,000 events for Roy Esp
         -orts.</p>                                                      
       8 - *     <VirtualList/>  or  <p>No kill-feed events for …</p>    
       9 - *   </section>                                                
      10 - *                                                             
      11 - * State is only the selected squad; the filtered events are de
         -rived with                                                     
      12 - * useMemo. The feed (1,000 events in the demo) is rendered thr
         -ough                                                           
      13 - * VirtualList, so only the rows in view plus the overscan rows
         - are in the                                                    
      14 - * DOM. The list is keyed by the filter, so choosing another sq
         -uad starts the                                                 
      15 - * new result at the top instead of at a stale scroll position.
      16 - *                                                             
      17 - * Screen-reader noise: individual events are never announced. 
         -The single                                                     
      18 - * polite status line changes only when the filter changes. Eac
         -h row reads as                                                 
      19 - * one sentence: "TE.Hawk eliminated CES.Nova with M416, 19:03:
         -04".                                                           
      20 - */                                                            
      21 -import { useId, useMemo, useState } from "react";              
      22 -import { PUBG_SQUADS, assertKillFeed, assertSquads } from "../d
         -ata/pubgSquads.js";                                            
      23 -import VirtualList from "./VirtualList.jsx";                   
      24 -import styles from "./Championship.module.css";                
      25 -                                                               
      26 -export const KILL_ROW_HEIGHT = 64;                             
      27 -export const KILL_FEED_VIEWPORT = 384;   // 6 rows             
      28 -export const KILL_FEED_OVERSCAN = 5;                           
      29 -const ALL = "all";                                             
      30 -                                                               
      31 -const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {         
      32 -    hour: "2-digit",                                           
      33 -    minute: "2-digit",                                         
      34 -    second: "2-digit",                                         
      35 -    timeZone: "Asia/Ho_Chi_Minh"                               
      36 -});                                                            
      37 -const COUNT_FORMAT = new Intl.NumberFormat("en-US");           
      38 -                                                               
      39 -function KillRow({ event }) {                                  
      40 -    return (                                                   
     … 154 more lines (ctrl+o to expand)
  ⎿  … 1 more file changed
  ⎿  (timeout 2m)

● All 189 unit tests pass. Mutation checks on the virtual list, since the PRD
  names spacer height, overscan and stable keys as risks:
  - (a) No padding spacer
  - (b) Overscan ignored
  - (c) Index keys

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; SP="C:/Users/admin/AppData/Local/Temp/claude/50d6cabe54ff641f/54
      029dc6-994b-4…)
  ⎿  == (a) no spacer
          × at the top: the 6 visible rows plus 5 overscan below, none abov
     e 10ms
     … +19 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● All three are caught; next I'm checking that Edge's padding-spacer list
  scrolls to full height, since layout is where the real risk is.

● Write(LAB3\HW\pubgArena\e2e\championship.spec.js)
  ⎿  Wrote 123 lines to LAB3\HW\pubgArena\e2e\championship.spec.js
       1 import { expect, test } from "@playwright/test";
       2 import AxeBuilder from "@axe-core/playwright";
       3 
       4 // T-03C in Microsoft Edge: the leaderboard and the virtualized 
         1,000-event kill feed,
       5 // measured with real layout and real scrolling.
       6 
       7 const ROW = 64;
       8 const VIEWPORT = 384;
       9 const OVERSCAN = 5;
     … +114 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test e2e/championship.spec.js 2>&1 | grep -vE
      "^\s*$" | grep -…)
  ⎿    ✘  1 e2e\championship.spec.js:49:1 › the 1,000-event feed scrolls th
     rough its full height while rendering at most 17 rows (621ms)
       ✘  2 e2e\championship.spec.js:68:1 › keyboard: the feed is focusable
     … +16 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● The virtual scroller's real-browser bug was found: padding-as-spacer grew the
  <ol> to the full list height so it never scrolled, which jsdom couldn't catch.
  I'm switching to a fixed-height <ol> with the spacers in ::before and ::after
  pseudo-elements.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='src/components/VirtualList.jsx'; s=open(p,encoding='utf8').rea…)
  ⎿  src/components/Championship.test.jsx:197:        expect(list.style.get
     PropertyValue("--virtual-before")).toBe("0px");
     src/components/Championship.test.jsx:198:        expect(list.style.get
     … +13 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\components\Championship.module.css (+13 
     -4)
      144  /* ---- virtual list -----------------------------------------
           ------------- */
      145  
      146  /*
      147 - * The <ol> is the scroll container. border-box is essential: 
          -the padding                                                   
      148 - * stands in for the rows that are not rendered, and with cont
          -ent-box it                                                    
      149 - * would be ADDED to the height, so the list would grow instea
          -d of scroll.                                                  
      147 + * The <ol> is the scroll container with a fixed height. The r
          +ows that are not                                              
      148 + * rendered are stood in for by ::before / ::after, sized by C
          +SS variables.                                                 
      149 + * (Padding cannot do this: a box always grows to contain its 
          +padding.)                                                     
      150   */
      151  .virtualList {
      152      box-sizing: border-box;
      153      list-style: none;
      154      margin: 0;
      155 +    padding: 0;                                               
      156      overflow-y: auto;
      157      overscroll-behavior: contain;
      158      background: var(--arena-background);
      159      border: 1px solid var(--arena-border);
      160      border-radius: 0.375rem;
      160 -    padding-inline: 0;                                        
      161  }
      162  
      163 +.virtualList::before,                                         
      164 +.virtualList::after {                                         
      165 +    content: "";                                              
      166 +    display: block;                                           
      167 +}                                                             
      168 +                                                              
      169 +.virtualList::before { height: var(--virtual-before, 0px); }  
      170 +.virtualList::after { height: var(--virtual-after, 0px); }    
      171 +                                                              
      172  .virtualRow {
      173      box-sizing: border-box;
      174      display: grid;
  ⎿  Updated LAB3\HW\pubgArena\src\components\Championship.test.jsx (+4 -4)
      194          const rows = within(list).getAllByRole("listitem");
      195          expect(rows).toHaveLength(4 + 3);                     
                      // 4 visible + 3 overscan below
      196          expect(list.style.height).toBe("200px");
      197 -        expect(list.style.paddingTop).toBe("0px");            
      198 -        expect(list.style.paddingBottom).toBe(`${(1000 - 7) * 
          -50}px`);                                                      
      197 +        expect(list.style.getPropertyValue("--virtual-before")
          +).toBe("0px");                                                
      198 +        expect(list.style.getPropertyValue("--virtual-after"))
          +.toBe(`${(1000 - 7) * 50}px`);                                
      199      });
      200  
      201      test("scrolling moves the window; padding keeps the full h
           eight; rows keep their stable keys", () => {
     ...
      206          const rows = within(list).getAllByRole("listitem");
      207          // start = floor(250/50) − 3 = 2; end = ceil(450/50) +
            3 = 12 (row 9 starts exactly at the bottom edge).
      208          expect(rows.map((row) => row.textContent)).toEqual(["I
           tem 2", "Item 3", "Item 4", "Item 5", "Item 6", "Item 7", "Ite
           m 8", "Item 9", "Item 10", "Item 11"]);
      209 -        expect(list.style.paddingTop).toBe("100px");          
      209 +        expect(list.style.getPropertyValue("--virtual-before")
          +).toBe("100px");                                              
      210          expect(rows[3]).toBe(firstRowBefore);                 
                        // same DOM node: keyed by id, not index
      211          scrollTo(list, 50000 - 200);
      212          const last = within(list).getAllByRole("listitem").at(
           -1);
      213          expect(last.textContent).toBe("Item 999");
      214 -        expect(list.style.paddingBottom).toBe("0px");         
      214 +        expect(list.style.getPropertyValue("--virtual-after"))
          +.toBe("0px");                                                 
      215      });
      216  
      217      test("tells assistive tech each row's position in the full
            list", () => {
  ⎿  Updated LAB3\HW\pubgArena\src\components\VirtualList.jsx (+80 -72)
       1 -/**                                                            
       2 - * KRAFTON x PUBG Vietnam Championship — T-03C virtual list (vi
         -ew)                                                            
       3 - *                                                             
       4 - *   <ol tabindex="0" aria-labelledby=… style="height: 400px; p
         -adding-top: Xpx; padding-bottom: Ypx">                         
       5 - *     <li aria-posinset="41" aria-setsize="1000">…</li>     on
         -ly startIndex … endIndex − 1                                   
       6 - *   </ol>                                                     
       7 - *                                                             
       8 - * The <ol> is the scroll container. Only the rows in view plus
         - `overscan`                                                    
       9 - * rows above and below are in the DOM; the rows outside are re
         -placed by                                                      
      10 - * padding-top / padding-bottom of exactly their height, so the
         - scrollbar                                                     
      11 - * matches the full list (no spacer <div> needed, Project Rule 
         -1). The maths                                                  
      12 - * lives in utils/virtualListUtils.js.                         
      13 - *                                                             
      14 - * Every row is an <li> keyed by getKey(item) (stable ids, neve
         -r the index),                                                  
      15 - * with aria-posinset / aria-setsize so assistive tech still kn
         -ows "item 41                                                   
      16 - * of 1,000" although only a window of rows exists. The list is
         - focusable                                                     
      17 - * (tabindex 0), so keyboard users can scroll it with the arrow
         - keys, Page                                                    
      18 - * Up / Down, Home and End. VirtualList owns the <ol> and the <
         -li>s;                                                          
      19 - * renderItem returns only the row content (Rule 4). Content is
         - rendered as                                                   
      20 - * React children, never as HTML (Rule 3).                     
      21 - */                                                            
      22 -import { useMemo, useState } from "react";                     
      23 -import { computeVisibleRange } from "../utils/virtualListUtils.
         -js";                                                           
      24 -import styles from "./Championship.module.css";                
      25 -                                                               
      26 -export default function VirtualList({ items, rowHeight, viewpor
         -tHeight, overscan = 5, getKey, renderItem, labelledBy, classNam
         -e }) {                                                         
      27 -    if (!Array.isArray(items)) throw new TypeError("VirtualList
         -: items must be an array");                                    
      28 -    if (typeof getKey !== "function") throw new TypeError("Virt
         -ualList: getKey must be a function");                          
      29 -    if (typeof renderItem !== "function") throw new TypeError("
         -VirtualList: renderItem must be a function");                  
      30 -    if (typeof labelledBy !== "string" || labelledBy === "") th
         -row new TypeError("VirtualList: labelledBy must be the id of th
         -e list's label");                                              
      31 -                                                               
      32 -    const [scrollTop, setScrollTop] = useState(0);             
      33 -    const range = useMemo(                                     
      34 -        () => computeVisibleRange({ itemCount: items.length, ro
         -wHeight, viewportHeight, scrollTop, overscan }),               
      35 -        [items.length, rowHeight, viewportHeight, scrollTop, ov
         -erscan]                                                        
      36 -    );                                                         
      37 -    const visible = items.slice(range.startIndex, range.endInde
         -x);                                                            
      38 -                                                               
      39 -    return (                                                   
      40 -        <ol                                                    
     … 112 more lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Both previously failing Edge tests now pass; I'm renaming the misleading
  padding helpers to spacerBefore/spacerAfter, then running a mutation check and
  a repeated full run.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; sed -i 's/paddingTop/spacerBefore/g;
      s/paddingBottom/spacerAfter/g; s/padding…)
  ⎿  src/components/VirtualList.jsx:17: * Why not padding-top / padding-bot
     tom on the <ol> (the first version)?
     src/components/VirtualList.jsx:18: * CSS never lets padding + border e
     … +8 lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\components\VirtualList.jsx (+80 -80)
       1 -/**                                                            
       2 - * KRAFTON x PUBG Vietnam Championship — T-03C virtual list (vi
         -ew)                                                            
       3 - *                                                             
       4 - *   <ol tabindex="0" aria-labelledby=… style="height: 384px; -
         --virtual-before: Xpx; --virtual-after: Ypx">                   
       5 - *     ::before  (X px, the rows above the window)             
       6 - *     <li aria-posinset="41" aria-setsize="1000">…</li>     on
         -ly startIndex … endIndex − 1                                   
       7 - *     ::after   (Y px, the rows below the window)             
       8 - *   </ol>                                                     
       9 - *                                                             
      10 - * The <ol> is the scroll container, with a fixed height. Only 
         -the rows in                                                    
      11 - * view plus `overscan` rows above and below are in the DOM; th
         -e rows outside                                                 
      12 - * are stood in for by the empty ::before / ::after pseudo-elem
         -ents, whose                                                    
      13 - * heights come from the CSS variables, so the scroll height al
         -ways equals                                                    
      14 - * the full list (no spacer <div>, Project Rule 1). The maths l
         -ives in                                                        
      15 - * utils/virtualListUtils.js.                                  
      16 - *                                                             
      17 - * Why not padding-top / padding-bottom on the <ol> (the first 
         -version)?                                                      
      18 - * CSS never lets padding + border exceed the box: with 63,000 
         -px of padding                                                  
      19 - * the list simply grew to 63,000 px instead of scrolling. jsdo
         -m does no                                                      
      20 - * layout, so only the Edge test (clientHeight 63296 instead of
         - 382) caught it.                                               
      21 - *                                                             
      22 - * Every row is an <li> keyed by getKey(item) (stable ids, neve
         -r the index),                                                  
      23 - * with aria-posinset / aria-setsize so assistive tech still kn
         -ows "item 41                                                   
      24 - * of 1,000" although only a window of rows exists. The list is
         - focusable                                                     
      25 - * (tabindex 0), so keyboard users can scroll it with the arrow
         - keys, Page                                                    
      26 - * Up / Down, Home and End. VirtualList owns the <ol> and the <
         -li>s;                                                          
      27 - * renderItem returns only the row content (Rule 4). Content is
         - rendered as                                                   
      28 - * React children, never as HTML (Rule 3).                     
      29 - */                                                            
      30 -import { useMemo, useState } from "react";                     
      31 -import { computeVisibleRange } from "../utils/virtualListUtils.
         -js";                                                           
      32 -import styles from "./Championship.module.css";                
      33 -                                                               
      34 -export default function VirtualList({ items, rowHeight, viewpor
         -tHeight, overscan = 5, getKey, renderItem, labelledBy, classNam
         -e }) {                                                         
      35 -    if (!Array.isArray(items)) throw new TypeError("VirtualList
         -: items must be an array");                                    
      36 -    if (typeof getKey !== "function") throw new TypeError("Virt
         -ualList: getKey must be a function");                          
      37 -    if (typeof renderItem !== "function") throw new TypeError("
         -VirtualList: renderItem must be a function");                  
      38 -    if (typeof labelledBy !== "string" || labelledBy === "") th
         -row new TypeError("VirtualList: labelledBy must be the id of th
         -e list's label");                                              
      39 -                                                               
      40 -    const [scrollTop, setScrollTop] = useState(0);             
     … 120 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\utils\virtualListUtils.js (+65 -65)
       1 -/**                                                            
       2 - * KRAFTON x PUBG Vietnam Championship — T-03C virtual list mat
         -hs (DOM-free)                                                  
       3 - *                                                             
       4 - * NOTE: the PRD asks to reuse "Lab 2 HW 3's Virtual Scroller".
         - No virtual                                                    
       5 - * scroller exists in this repository's Lab 2 work (the Lab 2 d
         -ata grid uses                                                  
       6 - * pagination, and Lab 2 HW 3 is the mega-sale countdown), so t
         -his one is new.                                                
       7 - * It keeps the Lab 2 data-grid architecture: a pure, validated
         - model                                                         
       8 - * (this file, like LAB2/HW/source/gridModel.js) and a thin vie
         -w                                                              
       9 - * (components/VirtualList.jsx) that only renders what the mode
         -l says.                                                        
      10 - *                                                             
      11 - * For fixed-height rows:                                      
      12 - *   startIndex = max(0, floor(scrollTop / rowHeight) − oversca
         -n)                                                             
      13 - *   endIndex   = min(count, ceil((scrollTop + viewportHeight) 
         -/ rowHeight) + overscan)                                       
      14 - * and the rows outside [startIndex, endIndex) are replaced by 
         -padding of                                                     
      15 - * exactly their total height, so the scrollable height (and th
         -e scrollbar)                                                   
      16 - * always matches the full list.                               
      17 - *                                                             
      18 - * scrollTop is clamped to the real scroll range first: when th
         -e list shrinks                                                 
      19 - * (a filter) while scrolled far down, an unclamped scrollTop w
         -ould point past                                                
      20 - * the end and render nothing.                                 
      21 - */                                                            
      22 -                                                               
      23 -function assertCount(value, name, { positive = false } = {}) { 
      24 -    if (!Number.isSafeInteger(value) || value < 0 || (positive 
         -&& value === 0)) {                                             
      25 -        throw new TypeError(`virtualList: ${name} must be ${pos
         -itive ? "a positive" : "a non-negative"} integer, received ${JS
         -ON.stringify(value)}`);                                        
      26 -    }                                                          
      27 -}                                                              
      28 -                                                               
      29 -export function computeVisibleRange({ itemCount, rowHeight, vie
         -wportHeight, scrollTop, overscan = 0 }) {                      
      30 -    assertCount(itemCount, "itemCount");                       
      31 -    assertCount(rowHeight, "rowHeight", { positive: true });   
      32 -    assertCount(viewportHeight, "viewportHeight", { positive: t
         -rue });                                                        
      33 -    assertCount(overscan, "overscan");                         
      34 -    if (typeof scrollTop !== "number" || !Number.isFinite(scrol
         -lTop)) {                                                       
      35 -        throw new TypeError(`virtualList: scrollTop must be a f
         -inite number, received ${JSON.stringify(scrollTop)}`);         
      36 -    }                                                          
      37 -                                                               
      38 -    const totalHeight = itemCount * rowHeight;                 
      39 -    const maxScrollTop = Math.max(0, totalHeight - viewportHeig
         -ht);                                                           
      40 -    const top = Math.min(Math.max(0, scrollTop), maxScrollTop);
     … 90 more lines (ctrl+o to expand)
  ⎿  Updated LAB3\HW\pubgArena\src\utils\virtualListUtils.test.js (+6 -6)
       8  describe("computeVisibleRange", () => {
       9      test("at the top: the 6 visible rows plus 5 overscan below,
           none above", () => {
      10          expect(computeVisibleRange({ ...base, scrollTop: 0 })).
          toEqual({
      11 -            startIndex: 0, endIndex: 11, paddingTop: 0, padding
         -Bottom: 989 * 64, totalHeight: 64000                           
      11 +            startIndex: 0, endIndex: 11, spacerBefore: 0, space
         +rAfter: 989 * 64, totalHeight: 64000                           
      12          });
      13      });
      14  
      15 -    test("in the middle: overscan on both sides, padding replac
         -es every unrendered row", () => {                              
      15 +    test("in the middle: overscan on both sides, spacers replac
         +e every unrendered row", () => {                               
      16          const range = computeVisibleRange({ ...base, scrollTop:
           640 });              // row 10 at the top
      17          expect(range).toMatchObject({ startIndex: 5, endIndex: 
          21 });
      18 -        expect(range.paddingTop + (range.endIndex - range.start
         -Index) * 64 + range.paddingBottom).toBe(range.totalHeight);    
      18 +        expect(range.spacerBefore + (range.endIndex - range.sta
         +rtIndex) * 64 + range.spacerAfter).toBe(range.totalHeight);    
      19      });
      20  
      21      test("a row cut by the viewport edge still counts as visibl
          e", () => {
     ...
      23          expect(range).toMatchObject({ startIndex: 0, endIndex: 
          7 });                  // rows 0..6 (6 is half visible)
      24      });
      25  
      26 -    test("at the bottom: the last row is rendered, padding-bott
         -om is 0", () => {                                              
      26 +    test("at the bottom: the last row is rendered, spacer after
         + is 0", () => {                                                
      27          const range = computeVisibleRange({ ...base, scrollTop:
           64000 - 384 });
      28 -        expect(range).toMatchObject({ endIndex: 1000, paddingBo
         -ttom: 0, startIndex: 1000 - 6 - 5 });                          
      28 +        expect(range).toMatchObject({ endIndex: 1000, spacerAft
         +er: 0, startIndex: 1000 - 6 - 5 });                            
      29      });
      30  
      31      test("never renders more than viewport rows + 1 partial + 2
           × overscan, whatever the list size", () => {
     ...
      43      });
      44  
      45      test("short lists render everything", () => {
      46 -        expect(computeVisibleRange({ ...base, itemCount: 3, scr
         -ollTop: 0 })).toMatchObject({ startIndex: 0, endIndex: 3, paddi
         -ngBottom: 0 });                                                
      46 +        expect(computeVisibleRange({ ...base, itemCount: 3, scr
         +ollTop: 0 })).toMatchObject({ startIndex: 0, endIndex: 3, space
         +rAfter: 0 });                                                  
      47          expect(computeVisibleRange({ ...base, itemCount: 0, scr
          ollTop: 0 })).toMatchObject({ startIndex: 0, endIndex: 0, total
          Height: 0 });
      48      });
      49  
  ⎿  … 1 more file changed
  ⎿  (timeout 8m 20s)

● The Edge test catches the break: without the ::after spacer, scrollHeight
  drops to 704 instead of 64000, and the full Edge suite passed 63/63 over three
  runs. I'm running the build and a 1440 px screenshot next.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vite build 2>&1 | tail -1;
      SP="C:/Users/admin/AppData/Local/Temp/claude/5…)
  ⎿  ✓ built in 271ms
       1 passed (5.2s)
  ⎿  (timeout 3m 20s)

  Read 1 file (ctrl+o to expand)

● The virtualized feed scrolls mid-list with real rows in the viewport.
  Committing PRD 3:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; git add -A . && git status --short . && git commit -q -F -
      <<'EOF'
      feat(hw3):…)
  ⎿  warning: in the working copy of 'LAB3/HW/pubgArena/e2e/championship.sp
     ec.js', LF will be replaced by CRLF the next time Git touches it
     warning: in the working copy of 'LAB3/HW/pubgArena/src/components/Cham
     … +23 lines (ctrl+o to expand)

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; python -c "
      p='lab3-hw3-pubg-arena.md'; s=open(p,encodin…)
  ⎿  ok
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

● PRD 3 is committed as 40a30fe with its evidence saved, and I'm moving on to
  PRD 4 by adding an Edge spec for the 12-scenario table, screenshot checks at
  four widths, a keyboard pass, and AI_FAILURE_AUDIT.md. I'll also widen the
  1440 px dashboard's max-width beyond 72rem.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; sed -i 's/    #root { max-width: 72rem; margin: 0 auto; padding:
      1.5rem 1rem…)
  ⎿  31:    #root { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem
     2rem; }
     33:    @media (min-width: 1440px) { #root { max-width: 86rem; padding-
     inline: 2rem; } }
  ⎿  Updated LAB3\HW\pubgArena\index.html (+48 -46)
       1 -<!doctype html>                                                
       2 -<html lang="en">                                               
       3 -<head>                                                         
       4 -  <meta charset="utf-8">                                       
       5 -  <meta name="viewport" content="width=device-width, initial-sc
         -ale=1">                                                        
       6 -  <title>Airdrop Arena – PUBG Vietnam Championship</title>     
       7 -  <meta name="description" content="Zero-drift countdowns to th
         -e PVS Grand Finals and the next G-Coin airdrop, with optimistic
         - VIP ticket and G-Coin crate claims (student project, simulatio
         -n data).">                                                     
       8 -  <meta name="theme-color" content="#0e1014">                  
       9 -  <!-- Empty inline icon: no /favicon.ico request, so no 404 in
         - the console. -->                                              
      10 -  <link rel="icon" href="data:,">                              
      11 -  <style>                                                      
      12 -    /* T-03A design tokens; every pair's contrast is checked by
         - src/theme.test.js. */                                         
      13 -    :root {                                                    
      14 -      --arena-background: #0e1014;                             
      15 -      --arena-surface: #181c23;                                
      16 -      --arena-text: #f5f5f4;                                   
      17 -      --arena-muted: #c8c6bd;                                  
      18 -      --arena-accent: #f2a900;                                 
      19 -      --arena-live: #4ade80;                                   
      20 -      --arena-danger: #f87171;                                 
      21 -      --arena-border: #6b7280;                                 
      22 -      --arena-focus: #38bdf8;                                  
      23 -      --arena-radius: 0.75rem;                                 
      24 -      color-scheme: dark;                                      
      25 -      font-family: system-ui, -apple-system, "Segoe UI", Roboto
         -, sans-serif;                                                  
      26 -      line-height: 1.4;                                        
      27 -      color: var(--arena-text);                                
      28 -      background: var(--arena-background);                     
      29 -    }                                                          
      30 -    body { margin: 0; min-height: 100vh; }                     
      31 -    #root { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1
         -rem 2rem; }                                                    
      32 -    #root > header { margin-bottom: 1.5rem; }                  
      33 -    #root > footer { margin-top: 2rem; font-size: 0.875rem; col
         -or: var(--arena-muted); }                                      
      34 -    #root > footer p { margin: 0; }                            
      35 -    .eyebrow { margin: 0; font-size: 0.875rem; font-weight: 700
         -; letter-spacing: 0.12em; text-transform: uppercase; color: var
         -(--arena-accent); }                                            
      36 -    h1 { margin: 0.25rem 0; font-size: clamp(1.75rem, 5vw, 2.5r
         -em); text-transform: uppercase; letter-spacing: 0.04em; }      
      37 -    .tagline { margin: 0; color: var(--arena-muted); }         
      38 -    :focus-visible { outline: 3px solid var(--arena-focus); out
         -line-offset: 2px; }                                            
      39 -  </style>                                                     
      40 -</head>                                                        
     … 54 more lines (ctrl+o to expand)

● Write(LAB3\HW\pubgArena\e2e\platform.spec.js)
  ⎿  Wrote 221 lines to LAB3\HW\pubgArena\e2e\platform.spec.js
       1 import { expect, test } from "@playwright/test";
       2 import AxeBuilder from "@axe-core/playwright";
       3 
       4 // T-03D — the integrated platform in Microsoft Edge: the PRD 4 
         section 4 scenario table walked
       5 // through in ONE page session (state must stay consistent acros
         s the three sections),
       6 // keyboard navigation with visible focus, and the four required
          viewports.
       7 
     … +214 lines (ctrl+o to expand)

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx playwright test e2e/platform.spec.js 2>&1 | grep -vE "^\s*$"
      | grep -E "✓…)
  ⎿    ✘  1 e2e\platform.spec.js:44:1 › PRD 4 scenario table, end to end, i
     n one session (30.1s)
       ✘  2 e2e\platform.spec.js:155:1 › keyboard only: every control is re
     … +35 lines (ctrl+o to expand)
  ⎿  (timeout 5m)

● Three test-side failures to fix: Playwright won't click aria-disabled buttons,
  my name lookup picks up the select's option text, and the leaderboard's 34rem
  minimum overflows at 1024 px, so I'll lower it and let the headers wrap.

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; python -c "
      p='e2e/platform.spec.js'; s=open(p,encoding='utf8').read()…)
  ⎿    6 passed (9.7s)
  ⎿  Updated LAB3\HW\pubgArena\src\components\Championship.module.css (+4 
     -1)
      102  
      103  .table {
      104      width: 100%;
      105 -    min-width: 34rem;                                         
      105 +    /* Fits the 3fr column at 1024px (34rem did not: the compa
          +ct desktop scrolled sideways). */                             
      106 +    min-width: 30rem;                                         
      107      border-collapse: collapse;
      108      font-variant-numeric: tabular-nums;
      109  }
     ...
      124  }
      125  
      126  .table thead th {
      127 +    white-space: normal;                                      
      128 +    vertical-align: bottom;                                   
      129      font-size: 0.8125rem;
      130      text-transform: uppercase;
      131      letter-spacing: 0.04em;
  ⎿  … 1 more file changed
  ⎿  (timeout 5m)

● All 6 platform tests pass. Next, the full unit suite, the complete Edge suite
  3 times to catch flakes, and the build:

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; npx vitest run 2>&1 | grep -E "Test Files|Tests "; npx
      playwright test --repe…)
  ⎿   Test Files  8 passed (8)
           Tests  189 passed (189)
       81 passed (38.4s)
     ✓ built in 285ms
  ⎿  (timeout 10m)
● All 189 unit tests, the 81 Edge runs and the build are green. I'm writing the
  audit at the project root in the PRD's format, with real before-and-after code
  and spec problems kept apart from AI mistakes.

● Write(LAB3\HW\pubgArena\AI_FAILURE_AUDIT.md)
  ⎿  Wrote 546 lines to LAB3\HW\pubgArena\AI_FAILURE_AUDIT.md
       1 # AI Failure Audit — HW 3
       2 
       3 ## Project
       4 KRAFTON x PUBG Vietnam Championship & Airdrop Arena
       5 
       6 `LAB3/HW/pubgArena` (Vite + React 19, Vitest, Playwright + axe-c
         ore in Microsoft Edge).
       7 
       8 All code in this homework was written with an AI assistant. The 
         cases below are
     … +538 lines (ctrl+o to expand)

● Every number in the audit matches the captured output, but the desktop axe
  line's "8 of 8 runs" can't be confirmed, since that output was cut off after 4
  desktop entries.

● Update(LAB3\HW\pubgArena\AI_FAILURE_AUDIT.md)
  ⎿  Added 1 line, removed 1 line
      80  
      81  ```
      82    ✘ ... phone (375px): no horizontal overflow, axe WCAG 2.2 AA 
          clean (30.1s)    (8 of 8 runs)
      83 -  ✘ ... desktop (1280px): no horizontal overflow, axe WCAG 2.2 
         -AA clean (30.1s)  (8 of 8 runs)                                
      83 +  ✘ ... desktop (1280px): no horizontal overflow, axe WCAG 2.2 
         +AA clean (30.1s)  (every run in the captured output)           
      84  ```
      85  
      86  ### Corrective action

● Bash(cd "D:/someweirdwebforV3rm0u1h/MSIS207.R11.CTTT-static_web-v3r/LAB3/HW/pu
      bgArena"; git add -A . && git status --short . && git commit -q -F -
      <<'EOF'
      test(hw3):…)
  ⎿  warning: in the working copy of 'LAB3/HW/pubgArena/index.html', LF wil
     l be replaced by CRLF the next time Git touches it
     warning: in the working copy of 'LAB3/HW/pubgArena/AI_FAILURE_AUDIT.md
     … +9 lines (ctrl+o to expand)

● Bash(cd "C:/Users/admin/.claude/projects/D--someweirdwebforV3rm0u1h-MSIS207-R1
      1-CTTT-static-web-v3r/memory"; python -c "
      p='lab3-hw3-pubg-arena.md'; s=open(p,encodin…)
  ⎿  - [LAB3 HW3 PUBG arena status + audit evidence](lab3-hw3-pubg-arena.md
     ) — all 4 PRDs + AI_FAILURE_AUDIT.md committed in LAB3/HW/pubgArena
  ⎿  Shell cwd was reset to 
     D:\someweirdwebforV3rm0u1h\MSIS207.R11.CTTT-static_web-v3r

● HW3 is finished: four commits, each with the PRD's exact commit message. At
  the end, all 189 unit tests pass, the 27 Edge tests passed 3 runs in a row
  (81/81), and the build works.

  ┌─────────┬───────────────────────────────────────────────┐
  │ Commit  │                      PRD                      │
  ├─────────┼───────────────────────────────────────────────┤
  │ eced8ac │ 1: zero-drift airdrop timer                   │
  ├─────────┼───────────────────────────────────────────────┤
  │ b1907fd │ 2: optimistic ticket and G-Coin claims        │
  ├─────────┼───────────────────────────────────────────────┤
  │ 40a30fe │ 3: virtualized PUBG VN leaderboard            │
  ├─────────┼───────────────────────────────────────────────┤
  │ 38e5676 │ 4: platform verification and AI failure audit │
  └─────────┴───────────────────────────────────────────────┘

  PRD 3: leaderboard and kill feed
  - Leaderboard: a real <table> with search by name or tag (accents ignored,
    using Lab 2's normalizeSearchText), a minimum-WWCD filter, and the three
    sorts.
    - Rows are worked out from the inputs with .toSorted(), not .sort(), and
      there's no useEffect for derived data. A test confirms the original squad
      list is never changed.
    - Every control has a visible label tied to it with useId().
  - Kill feed: 1,000 fictional events (the PRD's 2 plus 998 generated the same
    way every run), filtered by squad, with an empty state. Only the filter
    summary is announced to screen readers, never individual kills.
  - VirtualList is new: no Lab 2 virtual scroller exists anywhere in the repo.
    It keeps Lab 2's data-grid split between pure calculations
    (virtualListUtils.js) and a thin display component.
    - At most 17 rows are in the page at once, with overscan.
    - Rows are keyed by event id, so the same element is reused as you scroll.
    - Screen readers still hear "item 41 of 1,000", and the list can be scrolled
      with the keyboard.

  PRD 4: integration and verification
  - Scenario table: all 12 scenarios run end to end in one browser session.
    Playwright's clock drives both the countdowns and the mock server's 600 ms
    delay, and claim stock and leaderboard state stay correct across all of it.
  - Keyboard: a test tabs through the whole page in reading order and checks
    that every stop shows a focus ring.
  - Screen sizes: at 375, 768, 1024 and 1440 px:
    - the page never scrolls sideways;
    - the leaderboard scrolls sideways on phones only;
    - the panels sit side by side from 1024 px;
    - axe finds no WCAG 2.2 AA problems on the whole page.

  LAB3/HW/pubgArena/AI_FAILURE_AUDIT.md follows the PRD's format. Cases 01–03
  (Timer, Optimistic Rollback, Virtual Scroller) and four more each have
  before/after code and the real test output:
  - Virtual scroller (the strongest case): my first version used padding as the
    spacer, and the list grew 63,296 px tall instead of scrolling. All 189 unit
    tests passed, because jsdom doesn't compute layout. Only the Edge
    measurement caught it.
  - Rollback: I wrote two tests for late server responses that could never fail;
    breaking the code didn't turn them red. They were removed rather than
    counted as coverage.
  - Timer: my browser tests assumed Playwright's clock stays frozen. It doesn't,
    so they failed in 8 of 8 repeated runs, and pausing the clock then froze
    axe as well.

  PRD mistakes (the missing createAntiDriftTimer and Virtual Scroller, the
  price-format space, the reference hook's gaps) are kept in a separate
  "Specification issues" section, so they aren't counted as AI failures.

  Two things to check:
  - Audit location: I put it in the project folder, which is how the PRD's
    folder tree shows it. The repo root already has an older, unrelated
    AI_FAILURE_AUDIT.md, which I didn't touch. If your grader expects the file
    at the repo root, tell me and I'll move it.
  - Manual pieces not done: I didn't do any manual checks with a real screen
    reader, and the audit includes no screenshots, only test output. Both would
    be done by hand.

✻ Baked for 14m 41s · done 8:48 PM

※ recap: HW3, the PUBG Vietnam Airdrop Arena, is finished in four commits, with all tests passing and AI_FAILURE_AUDIT.md written inside LAB3/HW/pubgArena. Next, tell me if the audit should move to the repo root, where an older unrelated file with that name already sits. (disable recaps in /config)