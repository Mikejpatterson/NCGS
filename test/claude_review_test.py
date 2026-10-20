"""Offline checks for tools/agent/review_pr.py: no GitHub or model calls."""
import importlib.util, os, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / 'tools/agent/review_pr.py'
A, B = 'a' * 40, 'b' * 40


def marker(sha, verdict, who='github-actions[bot]'):
    return {'body': f'<!-- claude-review sha={sha} verdict={verdict} -->\nreview', 'user': {'login': who}}


class ClaudeReviewCheck(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.out = Path(self.tmp.name) / 'out'
        env = {'GITHUB_REPOSITORY': 'o/r', 'PR_NUMBER': '7', 'GITHUB_TOKEN': 'x', 'GITHUB_OUTPUT': str(self.out), 'MAX_REVIEWS': '5'}
        with patch.dict(os.environ, env):
            spec = importlib.util.spec_from_file_location('review_pr_under_test', SOURCE)
            self.m = importlib.util.module_from_spec(spec); spec.loader.exec_module(self.m)
        self.m.E = env
        self.posted = []

    def run_check(self, pages, head=A):
        def http(url, data=None):
            if data is not None:
                self.posted.append(data['body']); return {}
            if url.endswith('/pulls/7'):
                return {'head': {'sha': head}, 'base': {'ref': 'main'}}
            page = int(url.split('page=')[-1])
            return pages[page - 1] if page <= len(pages) else []
        self.out.write_text('')
        with patch.object(self.m, 'http', side_effect=http):
            self.m.check()
        return dict(l.split('=', 1) for l in self.out.read_text().splitlines())

    def test_completed_verdict_for_this_commit_is_not_repeated(self):
        self.assertEqual(self.run_check([[marker(A, 'APPROVE')]])['run'], 'false')

    def test_failed_attempt_can_be_retried(self):
        self.assertEqual(self.run_check([[marker(A, 'NO VERDICT')]])['run'], 'true')

    def test_new_commit_gets_a_review(self):
        self.assertEqual(self.run_check([[marker(B, 'APPROVE')]])['run'], 'true')

    def test_markers_beyond_the_first_page_count(self):
        filler = [{'body': 'chat', 'user': {'login': 'someone'}}] * 100
        self.assertEqual(self.run_check([filler, [marker(A, 'APPROVE')]])['run'], 'false')

    def test_copied_marker_from_another_account_is_ignored(self):
        self.assertEqual(self.run_check([[marker(A, 'APPROVE', who='Mikejpatterson')]])['run'], 'true')

    def test_attempt_limit_counts_failures_and_stops(self):
        five = [marker(B, 'NO VERDICT')] * 5
        result = self.run_check([five])
        self.assertEqual(result['run'], 'false')
        self.assertTrue(any('limit reached' in p for p in self.posted))

    def test_head_is_pinned_from_the_api(self):
        self.assertEqual(self.run_check([[]], head=B)['head'], B)


if __name__ == '__main__':
    unittest.main()
