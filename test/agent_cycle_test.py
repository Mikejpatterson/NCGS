"""Offline regression checks for the trusted orchestrator; no GitHub or paid model calls."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / 'tools/agent/run.py'


class AgentCycleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        task = root / 'task.md'
        task.write_text('Offline test task')
        env = {'CTL': str(root), 'WORK': str(root), 'OUT': str(root / 'out'),
               'TASK_FILE': str(task), 'GITHUB_REPOSITORY': 'example/test',
               'GITHUB_TOKEN': 'offline-placeholder', 'GITHUB_RUN_ID': '123',
               'BASE': 'design/crest-editorial-prototype', 'MODE': 'pr',
               'TASK_ID': '', 'GITHUB_STEP_SUMMARY': str(root / 'summary')}
        with patch.dict(os.environ, env):
            spec = importlib.util.spec_from_file_location('agent_cycle_under_test', SOURCE)
            self.m = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.m)
        self.m.E = env
        self.m.BASE_SHA = 'a' * 40

    def result(self, code=0, stdout=''):
        return subprocess.CompletedProcess([], code, stdout, '')

    def test_main_refused_before_checkout(self):
        self.m.BASE = 'main'
        with patch.object(self.m, 'git') as git:
            with self.assertRaisesRegex(RuntimeError, 'approved design branch'):
                self.m.main()
            git.assert_not_called()

    def test_push_refused_outside_exact_run_and_design_refs(self):
        with patch.object(self.m, 'sh') as sh:
            for ref in ('HEAD:refs/heads/main', 'HEAD:refs/heads/other', '--all',
                        '+HEAD:refs/heads/design/crest-editorial-prototype'):
                with self.subTest(ref=ref), self.assertRaises(RuntimeError):
                    self.m.push(ref)
            sh.assert_not_called()

    def test_only_run_and_design_pushes_allowed(self):
        with patch.object(self.m, 'sh', return_value=self.result()) as sh:
            for ref in (f'HEAD:refs/heads/{self.m.BRANCH}', f'HEAD:refs/heads/{self.m.BASE}'):
                self.m.push(ref)
                self.assertEqual(sh.call_args.args[0][-1], ref)

    def test_process_failure_cannot_be_hidden_by_model_json(self):
        with patch.object(self.m, 'sh', return_value=self.result(1, '{"result":"## Report\\nIncomplete", "is_error":false}')):
            _, ok = self.m.run_claude(1, None, {}, '')
        self.assertFalse(ok)

    def test_failed_coder_cannot_advance_queue_even_after_changes(self):
        def sh(cmd, **kwargs):
            return self.result(1 if cmd == ['git', 'diff', '--cached', '--quiet'] else 0)
        with patch.object(self.m, 'git', return_value='a' * 40), \
             patch.object(self.m, 'sh', side_effect=sh), \
             patch.object(self.m, 'comment'), \
             patch.object(self.m, 'run_claude', return_value=('Incomplete', False)), \
             patch.object(self.m, 'run_gates', return_value={'hard_ok': True, 'checks': []}), \
             patch.object(self.m, 'review', return_value={'verdict':'approve', 'summary':'', 'findings':[]}), \
             patch.object(self.m, 'finish') as finish:
            self.m.main()
        self.assertEqual(finish.call_args.args[0], 'error')
        self.assertTrue(finish.call_args.args[-1])  # Changes really existed.

    def _run_with_coder(self, coder_results, verdict='approve'):
        calls = iter(coder_results)
        def coder(*a):
            text, ok, unfinished = next(calls)
            self.m.UNFINISHED = unfinished
            return text, ok
        def sh(cmd, **kwargs):
            return self.result(1 if cmd == ['git', 'diff', '--cached', '--quiet'] else 0)
        with patch.object(self.m, 'git', return_value='a' * 40), \
             patch.object(self.m, 'sh', side_effect=sh), \
             patch.object(self.m, 'comment'), \
             patch.object(self.m, 'run_claude', side_effect=coder), \
             patch.object(self.m, 'run_gates', return_value={'hard_ok': True, 'checks': []}), \
             patch.object(self.m, 'review', return_value={'verdict': verdict, 'summary': '', 'findings': []}) as review, \
             patch.object(self.m, 'finish') as finish:
            self.m.main()
        return finish.call_args.args[0], review.call_count

    def test_unfinished_round_carries_on_and_is_never_reviewed(self):
        status, reviews = self._run_with_coder([('timed out', False, True), ('## Report done', True, False)])
        self.assertEqual(status, 'approved')
        self.assertEqual(reviews, 1)  # only the finished round was reviewed

    def test_unfinished_last_round_is_an_error(self):
        status, _ = self._run_with_coder([('t', False, True)] * 3)
        self.assertEqual(status, 'error')

    def test_crash_is_still_an_error_not_a_retry(self):
        status, _ = self._run_with_coder([('crash', False, False), ('## Report', True, False)])
        self.assertEqual(status, 'error')

    def test_branch_push_failure_prevents_pr_and_queue_advance(self):
        with patch.object(self.m, 'git', return_value='a' * 40), \
             patch.object(self.m, 'push', return_value=self.result(1)), \
             patch.object(self.m, 'http') as http, patch.object(self.m, 'chain') as chain:
            with self.assertRaisesRegex(RuntimeError, 'Could not push'):
                self.m.finish('approved', {}, {}, '', True)
            http.assert_not_called()
            chain.assert_not_called()

    def test_dispatch_acceptance_does_not_claim_execution(self):
        self.m.TASK_ID = 'first'
        def sh(cmd, **kwargs):
            return self.result(stdout='second\n' if 'next' in cmd else 'go\n')
        with patch.object(self.m, 'git'), patch.object(self.m, 'sh', side_effect=sh), \
             patch.object(self.m, 'push', return_value=self.result()), \
             patch.object(self.m, 'http', side_effect=[{'total_count':0}, {}]):
            message = self.m.chain('approved', True)
        self.assertIn('Requested', message)
        self.assertIn('execution is not yet verified', message)
        self.assertNotIn('Started the next', message)

    def test_pr_error_does_not_invent_owner_setting_requirement(self):
        messages = []
        with patch.object(self.m, 'git', return_value='a' * 40), \
             patch.object(self.m, 'push', return_value=self.result()), \
             patch.object(self.m, 'http', side_effect=RuntimeError('API temporarily unavailable')), \
             patch.object(self.m, 'chain', return_value='Queue unchanged'), \
             patch.object(self.m, 'comment', side_effect=messages.append):
            with self.assertRaises(SystemExit):
                self.m.finish('approved', {}, {}, '', True)
        self.assertIn('An owner-only setting has not been established', messages[-1])
        self.assertNotIn('tick "Allow GitHub Actions', messages[-1])

    def test_diverged_design_base_keeps_tested_sha_and_does_not_advance_queue(self):
        self.m.MODE = 'merge'
        self.m.TASK_ID = 'current-task'
        tested_sha = 'b' * 40
        # Even a docs-only concurrent change must not produce an untested rebase.
        def git(*args, **kwargs):
            return 'docs/CLAUDE-HANDOVER.md' if args[0] == 'diff' else tested_sha
        messages = []
        with patch.object(self.m, 'git', side_effect=git), \
             patch.object(self.m, 'sh', return_value=self.result()) as sh, \
             patch.object(self.m, 'push', side_effect=[self.result(), self.result(1), self.result()]) as push, \
             patch.object(self.m, 'http', return_value={'html_url': 'https://example.test/pr/1'}) as http, \
             patch.object(self.m, 'chain', return_value='Queue paused') as chain, \
             patch.object(self.m, 'comment', side_effect=messages.append):
            with self.assertRaises(SystemExit) as done:
                self.m.finish('approved', {}, {}, '', True)
        self.assertEqual(done.exception.code, 0)
        self.assertEqual(push.call_count, 2)  # run branch, then one fast-forward attempt
        self.assertFalse(any(c.args[0][:2] == ['git', 'rebase'] for c in sh.call_args_list))
        pr = next(c.args[2] for c in http.call_args_list if c.args[0].endswith('/pulls'))
        self.assertEqual(pr['head'], self.m.BRANCH)
        self.assertEqual(pr['base'], self.m.BASE)
        self.assertTrue(pr['draft'])
        chain.assert_called_once_with('approved', False)
        self.assertIn(tested_sha[:12], messages[-1])
        self.assertIn('nothing was integrated', messages[-1])
        self.assertNotIn('nothing: done', messages[-1])

    def test_successful_fast_forward_still_advances_queue(self):
        self.m.MODE = 'merge'
        with patch.object(self.m, 'git', return_value='b' * 40), \
             patch.object(self.m, 'push', return_value=self.result()) as push, \
             patch.object(self.m, 'http') as http, \
             patch.object(self.m, 'chain', return_value='Queue continued') as chain, \
             patch.object(self.m, 'comment'):
            with self.assertRaises(SystemExit) as done:
                self.m.finish('approved', {}, {}, '', True)
        self.assertEqual(done.exception.code, 0)
        self.assertEqual(push.call_count, 2)
        self.assertFalse(any(c.args[0].endswith('/pulls') for c in http.call_args_list))
        chain.assert_called_once_with('approved', True)


if __name__ == '__main__':
    unittest.main()
