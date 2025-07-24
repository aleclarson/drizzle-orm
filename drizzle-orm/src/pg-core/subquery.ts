import { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type { AddAliasToSelection } from '~/query-builders/select.types.ts';
import { SelectionProxyHandler } from '~/selection-proxy.ts';
import type { ColumnsSelection, SQL } from '~/sql/sql.ts';
import { type Subquery, WithSubquery, type WithSubqueryWithoutSelection } from '~/subquery.ts';
import { PgDialect } from './dialect.ts';
import { QueryBuilder } from './query-builders/query-builder.ts';
import { SelectedFields } from './query-builders/select.types.ts';

export type SubqueryWithSelection<
	TSelection extends ColumnsSelection,
	TAlias extends string,
> =
	& Subquery<TAlias, AddAliasToSelection<TSelection, TAlias, 'pg'>>
	& AddAliasToSelection<TSelection, TAlias, 'pg'>;

export type WithSubqueryWithSelection<
	TSelection extends ColumnsSelection,
	TAlias extends string,
> =
	& WithSubquery<TAlias, AddAliasToSelection<TSelection, TAlias, 'pg'>>
	& AddAliasToSelection<TSelection, TAlias, 'pg'>;

export class WithSubqueryBuilder<
	TAlias extends string,
	TSelection extends ColumnsSelection = never,
> {
	constructor(
		private dialect: PgDialect,
		private alias: TAlias,
		private selection?: TSelection,
	) {}

	as<T extends ColumnsSelection | undefined = never>(
		qb: TSelection extends never ? TypedQueryBuilder<T> | ((qb: QueryBuilder) => TypedQueryBuilder<T>)
			: SQL | ((qb: QueryBuilder) => SQL),
	) {
		const query = typeof qb === 'function'
			? qb(new QueryBuilder(this.dialect))
			: (qb as TypedQueryBuilder<any> | SQL);

		const selection: SelectedFields = this.selection
			|| (query instanceof TypedQueryBuilder && query.getSelectedFields())
			|| {};

		return new Proxy(
			new WithSubquery(query.getSQL(), selection, this.alias, true),
			new SelectionProxyHandler({
				alias: this.alias,
				sqlAliasedBehavior: 'alias',
				sqlBehavior: 'error',
			}),
		) as TSelection extends never ? T extends ColumnsSelection ? WithSubqueryWithSelection<T, TAlias>
			: WithSubqueryWithoutSelection<TAlias>
			: WithSubqueryWithSelection<TSelection, TAlias>;
	}
}
