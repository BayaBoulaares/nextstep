package com.nextstep.spec;

import com.nextstep.entity.AuditLog;
import com.nextstep.filter.AuditLogFilter;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class AuditLogSpec {

    private AuditLogSpec() {}

    /**
     * Construit une Specification JPA dynamique à partir du filtre.
     * Seuls les champs non-null du filtre sont appliqués.
     */
    public static Specification<AuditLog> withFilters(AuditLogFilter f) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // ── Recherche full-text ────────────────────────────────────────
            if (hasValue(f.getSearch())) {
                String like = "%" + f.getSearch().toLowerCase().trim() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("userEmail")),    like),
                        cb.like(cb.lower(root.get("userName")),     like),
                        cb.like(cb.lower(root.get("userId")),       like),
                        cb.like(cb.lower(root.get("description")),  like),
                        cb.like(cb.lower(root.get("resourceId")),   like),
                        cb.like(cb.lower(root.get("resourceLabel")),like),
                        cb.like(cb.lower(root.get("ipAddress")),    like)
                ));
            }

            // ── Filtres exacts ─────────────────────────────────────────────
            if (hasValue(f.getAction()))
                predicates.add(cb.equal(root.get("action"), f.getAction()));

            if (hasValue(f.getModule()))
                predicates.add(cb.equal(root.get("module"), f.getModule()));

            if (hasValue(f.getOutcome()))
                predicates.add(cb.equal(root.get("outcome"), f.getOutcome()));

            if (hasValue(f.getUserId()))
                predicates.add(cb.equal(root.get("userId"), f.getUserId()));

            if (hasValue(f.getUserEmail()))
                predicates.add(cb.like(
                        cb.lower(root.get("userEmail")),
                        "%" + f.getUserEmail().toLowerCase() + "%"
                ));

            if (hasValue(f.getResourceType()))
                predicates.add(cb.equal(root.get("resourceType"), f.getResourceType()));

            if (hasValue(f.getResourceId()))
                predicates.add(cb.equal(root.get("resourceId"), f.getResourceId()));

            if (hasValue(f.getIpAddress()))
                predicates.add(cb.like(
                        root.get("ipAddress"),
                        "%" + f.getIpAddress() + "%"
                ));

            // ── Plage de dates ─────────────────────────────────────────────
            if (f.getDateFrom() != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), f.getDateFrom()));

            if (f.getDateTo() != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), f.getDateTo()));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static boolean hasValue(String s) {
        return s != null && !s.isBlank();
    }
}