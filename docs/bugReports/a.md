## Authorization gap in Schedule CRUD Operations 
* I'm not verifying that the schedule_id belongs to the requesting user. Someone could craft a request with another user's scheduleId and overwrite their data. I should add a ownership check before the upsert.
* **Adressed.** Only updates or deletes when schedule_id matches the caller's schedule


## Prolema com update de eventos
Quando atualizo um evento, ao invés desse evento sobreescrever o outro, ele simplesmente cria um novo
  Brainstorm de soluções:
    1. 
      - Varios fetchs -> visualização, atualização, criação e remoção
      - Salvar o id dos eventos no banco de dados
      - Limpar o state que guarda as modificações toda vez que o usuario clica em salvar
      - Em um state separado, guarde somente o id de todos os eventos
      - Antes de cada fetch, comparar os ids que vão fazer parte da requisção com os ids salvados em state
        - ids novos -> adicionar
        - ids repetidos -> atualizar ou deletar
    2. 
      - objeto `pendingChanges` com 3 chaves: `create`, `update` e `delete`
      - atualizar `pendingChanges` quando uma função `add`, `remove` ou `update` é chamada
      
* **Resolvido.** Usei a solução 2.