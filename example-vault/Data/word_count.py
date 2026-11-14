"""Counts the words in every note of this vault, the longest first."""
from pathlib import Path

VAULT = Path(__file__).resolve().parent.parent


def words(path: Path) -> int:
    # Properties between the first two --- lines aren't counted.
    text = path.read_text(encoding="utf-8")
    if text.startswith("---\n"):
        text = text.split("\n---\n", 1)[-1]
    return len(text.split())


if __name__ == "__main__":
    counts = {p.relative_to(VAULT): words(p) for p in VAULT.rglob("*.md")}
    for note, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"{n:6}  {note}")
    print(f"{sum(counts.values()):6}  in all")
