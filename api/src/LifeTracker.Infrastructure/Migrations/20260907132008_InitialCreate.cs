using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "academic_subjects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    code = table.Column<string>(type: "text", nullable: true),
                    term = table.Column<string>(type: "text", nullable: false),
                    professor = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    color = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_academic_subjects", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ai_conversations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_conversations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "daily_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    mood_score = table.Column<short>(type: "smallint", nullable: true),
                    energy_score = table.Column<short>(type: "smallint", nullable: true),
                    summary_text = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_daily_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "habit_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: false),
                    frequency_type = table.Column<string>(type: "text", nullable: false),
                    target_days_per_week = table.Column<int>(type: "integer", nullable: true),
                    specific_days = table.Column<string>(type: "text", nullable: true),
                    color = table.Column<string>(type: "text", nullable: true),
                    icon = table.Column<string>(type: "text", nullable: true),
                    is_archived = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_habit_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "health_studies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    study_type = table.Column<string>(type: "text", nullable: false),
                    study_date = table.Column<DateOnly>(type: "date", nullable: false),
                    file_url = table.Column<string>(type: "text", nullable: false),
                    institution = table.Column<string>(type: "text", nullable: true),
                    summary = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_health_studies", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "text", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    pinned = table.Column<bool>(type: "boolean", nullable: false),
                    is_stub = table.Column<bool>(type: "boolean", nullable: false),
                    is_archived = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "timeline_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    source_module = table.Column<string>(type: "text", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    summary = table.Column<string>(type: "text", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: false),
                    pinned = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_timeline_items", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "work_projects",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    color = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_projects", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "academic_milestones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    subject_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    milestone_type = table.Column<string>(type: "text", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    grade = table.Column<decimal>(type: "numeric(4,2)", nullable: true),
                    weight_percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    replaces_milestone_id = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_academic_milestones", x => x.id);
                    table.ForeignKey(
                        name: "FK_academic_milestones_academic_milestones_replaces_milestone_~",
                        column: x => x.replaces_milestone_id,
                        principalTable: "academic_milestones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_academic_milestones_academic_subjects_subject_id",
                        column: x => x.subject_id,
                        principalTable: "academic_subjects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ai_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    conversation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    tool_calls = table.Column<string>(type: "jsonb", nullable: false),
                    tool_results = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_ai_messages_ai_conversations_conversation_id",
                        column: x => x.conversation_id,
                        principalTable: "ai_conversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "habit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    habit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_habit_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_habit_logs_habit_definitions_habit_id",
                        column: x => x.habit_id,
                        principalTable: "habit_definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "health_clinical_values",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    study_id = table.Column<Guid>(type: "uuid", nullable: false),
                    metric_name = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false),
                    unit = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: true),
                    is_abnormal = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_health_clinical_values", x => x.id);
                    table.ForeignKey(
                        name: "FK_health_clinical_values_health_studies_study_id",
                        column: x => x.study_id,
                        principalTable: "health_studies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "note_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_note_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_note_id = table.Column<Guid>(type: "uuid", nullable: false),
                    link_text = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_note_links", x => x.id);
                    table.ForeignKey(
                        name: "FK_note_links_notes_source_note_id",
                        column: x => x.source_note_id,
                        principalTable: "notes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_note_links_notes_target_note_id",
                        column: x => x.target_note_id,
                        principalTable: "notes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_tasks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    priority = table.Column<string>(type: "text", nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    position = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_tasks", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_tasks_work_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "work_projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    task_id = table.Column<Guid>(type: "uuid", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_sessions_work_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "work_projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_work_sessions_work_tasks_task_id",
                        column: x => x.task_id,
                        principalTable: "work_tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_academic_milestones_replaces_milestone_id",
                table: "academic_milestones",
                column: "replaces_milestone_id");

            migrationBuilder.CreateIndex(
                name: "IX_academic_milestones_subject_id",
                table: "academic_milestones",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "IX_academic_milestones_user_id_due_date",
                table: "academic_milestones",
                columns: new[] { "user_id", "due_date" });

            migrationBuilder.CreateIndex(
                name: "IX_academic_subjects_user_id_term",
                table: "academic_subjects",
                columns: new[] { "user_id", "term" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_conversations_user_id_updated_at",
                table: "ai_conversations",
                columns: new[] { "user_id", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_messages_conversation_id_created_at",
                table: "ai_messages",
                columns: new[] { "conversation_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_daily_logs_user_id_date",
                table: "daily_logs",
                columns: new[] { "user_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_habit_logs_habit_id_date",
                table: "habit_logs",
                columns: new[] { "habit_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_habit_logs_user_id_date",
                table: "habit_logs",
                columns: new[] { "user_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_health_clinical_values_study_id",
                table: "health_clinical_values",
                column: "study_id");

            migrationBuilder.CreateIndex(
                name: "IX_note_links_source_note_id",
                table: "note_links",
                column: "source_note_id");

            migrationBuilder.CreateIndex(
                name: "IX_note_links_source_note_id_target_note_id",
                table: "note_links",
                columns: new[] { "source_note_id", "target_note_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_note_links_target_note_id",
                table: "note_links",
                column: "target_note_id");

            migrationBuilder.CreateIndex(
                name: "IX_note_links_user_id_target_note_id",
                table: "note_links",
                columns: new[] { "user_id", "target_note_id" });

            migrationBuilder.CreateIndex(
                name: "IX_notes_user_id_slug",
                table: "notes",
                columns: new[] { "user_id", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_notes_user_id_updated_at",
                table: "notes",
                columns: new[] { "user_id", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_timeline_items_source_module_source_id",
                table: "timeline_items",
                columns: new[] { "source_module", "source_id" });

            migrationBuilder.CreateIndex(
                name: "IX_timeline_items_user_id_date",
                table: "timeline_items",
                columns: new[] { "user_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_work_projects_user_id",
                table: "work_projects",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_work_sessions_project_id",
                table: "work_sessions",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "IX_work_sessions_task_id",
                table: "work_sessions",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "IX_work_sessions_user_id_started_at",
                table: "work_sessions",
                columns: new[] { "user_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "IX_work_tasks_project_id_status_position",
                table: "work_tasks",
                columns: new[] { "project_id", "status", "position" });

            migrationBuilder.CreateIndex(
                name: "IX_work_tasks_user_id_status",
                table: "work_tasks",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_work_tasks_user_id_status_position",
                table: "work_tasks",
                columns: new[] { "user_id", "status", "position" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "academic_milestones");

            migrationBuilder.DropTable(
                name: "ai_messages");

            migrationBuilder.DropTable(
                name: "daily_logs");

            migrationBuilder.DropTable(
                name: "habit_logs");

            migrationBuilder.DropTable(
                name: "health_clinical_values");

            migrationBuilder.DropTable(
                name: "note_links");

            migrationBuilder.DropTable(
                name: "timeline_items");

            migrationBuilder.DropTable(
                name: "work_sessions");

            migrationBuilder.DropTable(
                name: "academic_subjects");

            migrationBuilder.DropTable(
                name: "ai_conversations");

            migrationBuilder.DropTable(
                name: "habit_definitions");

            migrationBuilder.DropTable(
                name: "health_studies");

            migrationBuilder.DropTable(
                name: "notes");

            migrationBuilder.DropTable(
                name: "work_tasks");

            migrationBuilder.DropTable(
                name: "work_projects");
        }
    }
}
