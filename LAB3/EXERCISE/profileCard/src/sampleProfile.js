/** Sample data for the demo: DeveloperCard gets everything through props. */
export const sampleProfile = Object.freeze({
    name: "Linh Tran",
    title: "Semantic Engineer & Pro-Gamer",
    // Generated avatar (no real person), served over HTTPS.
    avatarUrl: "https://api.dicebear.com/9.x/pixel-art/svg?seed=LinhTran",
    role: "Front-end Engineer",
    experience: "6 years",
    location: "Ho Chi Minh City, Vietnam",
    mainGame: "Valorant (Immortal 2)",
    skills: Object.freeze([
        Object.freeze({ id: "react", name: "React", level: "Advanced" }),
        Object.freeze({ id: "a11y", name: "Accessibility", level: "Advanced" }),
        Object.freeze({ id: "css", name: "CSS", level: "Intermediate" }),
        Object.freeze({ id: "node", name: "Node.js", level: "Intermediate" })
    ])
});

/**
 * Stress profile for the 375px QA check (?profile=long): unbroken long words,
 * long metadata and an HTML-looking string that must show up as plain text.
 */
export const longProfile = Object.freeze({
    ...sampleProfile,
    name: "Maximiliana Wolfeschlegelsteinhausenbergerdorff",
    title: "Principal Semantic Accessibility Engineer & Esports Team Captain",
    role: "<b>Staff</b> Front-end Platform Engineer, Design Systems",
    experience: "12 years across agencies, product teams and open source",
    location: "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch, Wales",
    mainGame: "StarCraft II: Legacy of the Void (Grandmaster, Europe server)",
    skills: Object.freeze([
        ...sampleProfile.skills,
        Object.freeze({ id: "a11y-long", name: "WebContentAccessibilityGuidelinesConformanceTesting", level: "Advanced" }),
        Object.freeze({ id: "ts", name: "TypeScript generics and conditional types", level: "Intermediate" })
    ])
});
