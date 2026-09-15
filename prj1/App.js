import React from 'react';
import './App.css';
import NothingSection from './NothingSection';

function App() {
  const sections = [
    {
      title: "Nothing",
      description: "There is nothing here",
      buttonText: "Do nothing",
      linkText: "Nothing",
      status: "Nothing happened"
    },
    {
      title: "This web does nothing",
      description: "And that is exactly what it is supposed to do",
      buttonText: "Do nothing",
      linkText: "Learn nothing",
      status: "Nothing will happen"
    },
    {
      title: "Still nothing",
      description: "You made it this far",
      buttonText: "Try again",
      linkText: "Go nowhere",
      status: "Nothing changed"
    }
  ];

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Nothing home">Nothing</a>
        <nav aria-label="Main navigation">
          <a href="#">Nothing</a>
          <a href="#">Nothing else</a>
          <a href="#">Nowhere</a>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Nothing</p>
          <h1 id="hero-title">This web does nothing</h1>
          <p>And that is exactly what it is supposed to do.</p>
        </section>

        <section className="nothing-grid" aria-label="Nothing">
          {sections.map((section, index) => (
            <NothingSection 
              key={index}
              title={section.title}
              description={section.description}
              buttonText={section.buttonText}
              linkText={section.linkText}
              status={section.status}
            />
          ))}
        </section>

        <p className="closing-line">You can stop looking.</p>
      </main>

      <footer className="site-footer">
        <span>Nothing © 2026</span>
        <span>There is nothing else</span>
      </footer>
    </div>
  );
}

export default App;