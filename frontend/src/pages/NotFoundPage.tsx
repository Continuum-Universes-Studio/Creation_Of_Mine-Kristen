import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main>
      <section className="section">
        <div className="wrap center">
          <p className="kicker">Lost in the garden</p>
          <h1>That page wandered off.</h1>
          <p className="lede">The story you wanted is not at this address.</p>
          <p><Link className="btn" to="/">Back home</Link></p>
        </div>
      </section>
    </main>
  );
}
