<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Project/quotation codes are generated only via server fn reservarCodigo (src/lib/codigos.functions.ts); the SQL functions are service_role-only — prevents direct calls from the browser.
- The programmed-progress matrix stores one percentage per leaf work item and project-defined period; dashboard calculations must exclude grouping rows to avoid double counting.
