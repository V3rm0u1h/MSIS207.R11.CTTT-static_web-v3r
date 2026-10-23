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
