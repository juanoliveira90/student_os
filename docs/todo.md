## Iterations
* Implement local-first design
* Refactor client-side route handling -> switch to library @tanstack/react-router
* Create pageSkeleton when loading the dashboard


## Study Plan
### Tabelas
- **Study Plan**: pai de todos os subjects
- **Subject**: um único plano de estudo
- **Subtasks**: pertencem a um único subject
### Add subject -> modelo inicial
- front: 
    - **Envia:** subject id, subject name, subtask (opcional) [ id, name, desc? ]
- back: 
    - **Verifica** se o subject id e subtask id percente ao usuario
    - **Insere** nas tabelas StudyPlan