// src/components/common/Footer.jsx

export default function Footer() {
  return (
    <footer className="cs-footer">
      <p>© {new Date().getFullYear()} Mohsin Nadaf · CineSphere</p>

      <p
        style={{
          marginTop: "6px",
          fontSize: "11px",
          lineHeight: "1.5",
          color: "var(--cs-text-muted)",
          maxWidth: "900px",
          marginInline: "auto",
        }}
      >
        CineSphere is a personal, non-commercial project built for learning
        purposes.
        <br />
        All media content is owned by their respective copyright holders.
      </p>
    </footer>
  );
}
