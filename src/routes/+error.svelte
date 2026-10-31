<script lang="ts">
  import { t } from '$lib/i18n.svelte';
</script>

<svelte:head><title>{t('notFound.title')} · HorizonView</title></svelte:head>

<div class="page">
  <div class="empty">
    <h1>{t('notFound.title')}</h1>
    <p>{t('notFound.body')}</p>
    <a class="btn btn-primary" href="/">{t('notFound.home')}</a>
  </div>
</div>
