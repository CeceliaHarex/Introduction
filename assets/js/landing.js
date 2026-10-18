(function () {
  "use strict";

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach(function (node) {
      node.textContent = text;
    });
  }

  function setStats(repos, user, timestamp) {
    var count = Array.isArray(repos) ? repos.length : 0;
    var since =
      user && user.created_at
        ? new Date(user.created_at).getFullYear()
        : PF.get("identity.since", "");

    setText("[data-stat='repos']", String(count).padStart(2, "0"));
    setText("[data-stat='since']", String(since || "—"));
    setText("[data-stat='synced']", timestamp ? PF.relative(timestamp) : "—");
  }

  async function init() {
    var login = PF.github.owner();
    var snapshot = null;

    try {
      snapshot = await PF.github.getSnapshot();
      setStats(snapshot.data, snapshot.user, snapshot.ts);
    } catch (error) {
      snapshot = null;
    }

    try {
      var repos = await PF.github.getRepos(login);
      setStats(repos.data, snapshot && snapshot.user, repos.ts);
    } catch (error) {}

    try {
      var user = await PF.github.getUser(login);
      if (user && user.data && user.data.created_at) {
        setText("[data-stat='since']", String(new Date(user.data.created_at).getFullYear()));
      }
    } catch (error) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
