import React from 'react';

const NothingSection = ({ title, description, buttonText, linkText, status }) => {
  const handleNothing = () => {
    console.log("Nothing happened.");
  };

  return (
    <article className="nothing-section">
      <div>
        <h2>{title}</h2>
        <p className="description">{description}</p>
      </div>
      <div className="actions">
        <button type="button" onClick={handleNothing}>{buttonText}</button>
        <a href="#">{linkText}</a>
      </div>
      <p className="status">{status}</p>
    </article>
  );
};

export default NothingSection;