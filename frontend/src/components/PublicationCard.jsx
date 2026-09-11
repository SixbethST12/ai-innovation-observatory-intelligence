/**
 * PublicationCard.jsx — One publication row/card.
 *
 * PURPOSE:
 *   Show a single publication's title, source, date, topics, and a
 *   snippet of the AI summary — with a link to the original source.
 *
 * USED BY:
 *   - pages/Publications.jsx
 *   - pages/Search.jsx
 *   - pages/Overview.jsx (recent pubs)
 *
 * TRACEABILITY:
 *   Always renders the original source link so users can verify
 *   the AI-generated content.
 */

export default function PublicationCard({ pub, onSelect }) {
  const topics = pub.ai_topics ? pub.ai_topics.split(",").filter(Boolean) : [];
  const date = pub.published_date
    ? new Date(pub.published_date).toISOString().slice(0, 10)
    : "—";

  return (
    <article className="pub-card" onClick={() => onSelect?.(pub)}>
      <header className="pub-head">
        <span className="pub-inst">{pub.institution}</span>
        <span className="pub-date">{date}</span>
      </header>

      <h3 className="pub-title">{pub.title}</h3>

      {topics.length > 0 && (
        <div className="pub-topics">
          {topics.map((t) => (
            <span key={t} className="topic-pill">{t.replace(/_/g, " ")}</span>
          ))}
        </div>
      )}

      {pub.ai_summary && (
        <p className="pub-summary">
          {pub.ai_summary.replace(/^\d+\.\s/gm, "").slice(0, 220)}…
        </p>
      )}

      <footer className="pub-foot">
        <a
          href={pub.source_url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="pub-source"
        >
          Original source ↗
        </a>
        {pub.ai_engine && (
          <span className="pub-engine">AI: {pub.ai_engine}</span>
        )}
      </footer>
    </article>
  );
}
