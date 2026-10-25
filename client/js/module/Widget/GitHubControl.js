/**
 * Read-only GitHub Control data controller.
 * Uses public GitHub REST endpoints; private repositories require a server proxy.
 * UI-independent for future Desktop and Spatial renderers.
 */
export default class GitHubControlWidget {
  constructor({ repository = 'blacknode305/dashboardx', fetchImpl = fetch } = {}) {
    this.fetchImpl = fetchImpl;
    this.setRepository(repository);
    this.state = { status: 'idle', data: null, error: null, updatedAt: null };
  }
  setRepository(repository) {
    if (typeof repository !== 'string' || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository) || repository.includes('..')) {
      throw new TypeError('Expected owner/repository');
    }
    this.repository = repository;
  }
  getState() { return { ...this.state }; }
  async refresh() {
    this.state = { ...this.state, status: 'loading', error: null };
    const response = await this.fetchImpl(`https://api.github.com/repos/${this.repository}`, {
      headers: { Accept: 'application/vnd.github+json' }
    }).catch(error => { throw new Error(`GitHub network error: ${error.message}`); });
    if (!response.ok) {
      this.state = { ...this.state, status: 'error', error: `GitHub HTTP ${response.status}` };
      return this.getState();
    }
    const repo = await response.json();
    this.state = {
      status: 'ready',
      error: null,
      updatedAt: new Date().toISOString(),
      data: {
        fullName: String(repo.full_name ?? this.repository),
        description: String(repo.description ?? ''),
        stars: Number(repo.stargazers_count ?? 0),
        forks: Number(repo.forks_count ?? 0),
        openIssues: Number(repo.open_issues_count ?? 0),
        defaultBranch: String(repo.default_branch ?? ''),
        url: String(repo.html_url ?? '')
      }
    };
    return this.getState();
  }
  destroy() {}
}
