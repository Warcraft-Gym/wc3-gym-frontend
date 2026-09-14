set shell := ["bash", "-euo", "pipefail", "-c"]

# Regenerate docs/okf/index.html, the graph viewer that GitHub Pages serves. Node colours per concept type.
okf-graph:
    rm -rf /tmp/okf-spec && git clone -q --depth 1 https://github.com/GoogleCloudPlatform/open-knowledge-format /tmp/okf-spec
    PYTHONPATH=/tmp/okf-spec/src uv run --no-project --with pyyaml python -c "import reference_agent.viewer.generator as G; from pathlib import Path; G._TYPE_PALETTE.clear(); G._TYPE_PALETTE.update({\"Domain Concept\": \"#2a78d6\", \"Decision\": \"#eb6834\", \"Runbook\": \"#1baf7a\", \"Convention\": \"#eda100\", \"Integration\": \"#e87ba4\", \"Data Model\": \"#008300\", \"API Area\": \"#4a3aa7\", \"Pitfall\": \"#e34948\"}); print(G.generate_visualization(Path(\"docs/okf\"), Path(\"docs/okf/index.html\"), bundle_name=\"wc3-gym-frontend knowledge bundle\"))"
    sed -i 's#<head>#<head>\n  <meta name="robots" content="noindex, nofollow">#' docs/okf/index.html
