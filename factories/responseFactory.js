class ResponseFactory {
  static success({
    res,
    statusCode = 200,
    message = "Operation successful",
    data = null,
    meta = {},
  }) {
    const response = {
      success: true,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (data !== null) {
      response.body = data;
    }

    return res.status(statusCode).json(response);
  }
  static created({
    res,
    message = "Resource created successfully",
    data = null,
    meta = {},
  }) {
    return this.success({ res, statusCode: 201, message, data, meta });
  }

  static accepted({
    res,
    message = "Request accepted",
    data = null,
    meta = {},
  }) {
    return this.success({ res, statusCode: 202, message, data, meta });
  }

  static noContent({ res }) {
    return res.status(204).send();
  }

  static paginated({
    res,
    data,
    pagination,
    message = "Data retrieved successfully",
  }) {
    return this.success({
      res,
      statusCode: 200,
      message,
      data,
      meta: {
        pagination: {
          currentPage: pagination.page,
          itemsPerPage: pagination.limit,
          totalItems: pagination.total,
          totalPages: pagination.totalPages,
          hasNextPage: pagination.page < pagination.totalPages,
          hasPrevPage: pagination.page > 1,
        },
      },
    });
  }

  static authSuccess({
    res,
    token,
    user,
    message = "Authentication successful",
  }) {
    return this.success({
      res,
      statusCode: 200,
      message,
      data: { user, token },
    });
  }
}

module.exports = { ResponseFactory };
