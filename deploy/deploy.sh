#!/bin/bash
# Called by ~/webhook.py (POST /deploy/applab). The trigger is the GitHub Actions workflow
# .github/workflows/previews.yml, after it has built the web previews and pushed them to the
# `previews` branch. Output: data/deploy.log. Pattern copied from ~/reseller/deploy/deploy.sh.
# Never builds anything: previews arrive ready-made (this box has no memory to spare).
# Needs sudoers NOPASSWD: /bin/systemctl restart applab-web
set -e
mkdir -p /home/botuser/applab/data
exec >> /home/botuser/applab/data/deploy.log 2>&1
echo "── deploy started $(date)"
cd /home/botuser/applab

if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Refusing to deploy: /home/botuser/applab has uncommitted changes to tracked files." >&2
    echo "Commit or stash them first; deploys must match what's on GitHub." >&2
    exit 1
fi

git fetch origin main
git pull --ff-only origin main
[ -d venv ] || python3 -m venv venv
venv/bin/pip install -r requirements.txt -q
venv/bin/pytest -q

# Previews: unpack the `previews` branch (one commit, static files) into data/previews/.
if git ls-remote --exit-code --heads origin previews >/dev/null; then
    git fetch origin +previews:refs/remotes/origin/previews
    rm -rf data/previews.new data/previews.old
    mkdir data/previews.new
    git archive refs/remotes/origin/previews | tar -x -C data/previews.new
    [ -d data/previews ] && mv data/previews data/previews.old
    mv data/previews.new data/previews
    rm -rf data/previews.old
    echo "Previews: $(ls data/previews | tr '\n' ' ')"
fi

sudo systemctl restart applab-web
echo "Deployed applab at $(date)"
